import { parentPort, workerData } from 'node:worker_threads';
import Database from 'better-sqlite3';
import { mkdir, readFile, readdir, stat, realpath } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { compileSearch, type SearchInput } from './search';
import { parseOsu, readCollections, readStableDatabase, within, type StableEntry } from './stable';
import { openLazerLibrary, readLazerMap } from './lazer';
import type { Beatmap, Job, LibrarySelection, Play, PlayEvent } from '../shared/types';

await mkdir(workerData.dataDir, { recursive: true });
const db = new Database(path.join(workerData.dataDir, 'catalog.sqlite'));
db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON'); db.pragma('busy_timeout = 5000');
db.exec(`
CREATE TABLE IF NOT EXISTS maps (
 checksum TEXT PRIMARY KEY, beatmap_id INTEGER, set_id INTEGER, set_key TEXT NOT NULL,
 title TEXT NOT NULL, artist TEXT NOT NULL, creator TEXT NOT NULL, version TEXT NOT NULL,
 mode INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'unknown', stars REAL, bpm REAL,
 length INTEGER NOT NULL DEFAULT 0, ar REAL NOT NULL DEFAULT 5, od REAL NOT NULL DEFAULT 5,
 cs REAL NOT NULL DEFAULT 5, hp REAL NOT NULL DEFAULT 5, objects INTEGER NOT NULL DEFAULT 0,
 tags TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', local INTEGER NOT NULL DEFAULT 0,
 played INTEGER NOT NULL DEFAULT 0, last_played TEXT, play_count INTEGER NOT NULL DEFAULT 0,
 file_path TEXT, background_path TEXT, audio_path TEXT, preview INTEGER NOT NULL DEFAULT -1,
 cover TEXT, file_size INTEGER, file_mtime REAL, generation TEXT,
 indexed_at TEXT NOT NULL, fetched_at TEXT
);
CREATE INDEX IF NOT EXISTS maps_filter ON maps(local, mode, status, stars);
CREATE INDEX IF NOT EXISTS maps_online_id ON maps(beatmap_id);
CREATE INDEX IF NOT EXISTS maps_set ON maps(set_key);
CREATE INDEX IF NOT EXISTS maps_path ON maps(file_path);
CREATE VIRTUAL TABLE IF NOT EXISTS maps_fts USING fts5(title, artist, creator, version, tags, source, content='maps', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER IF NOT EXISTS maps_ai AFTER INSERT ON maps BEGIN INSERT INTO maps_fts(rowid,title,artist,creator,version,tags,source) VALUES(new.rowid,new.title,new.artist,new.creator,new.version,new.tags,new.source); END;
CREATE TRIGGER IF NOT EXISTS maps_ad AFTER DELETE ON maps BEGIN INSERT INTO maps_fts(maps_fts,rowid,title,artist,creator,version,tags,source) VALUES('delete',old.rowid,old.title,old.artist,old.creator,old.version,old.tags,old.source); END;
CREATE TRIGGER IF NOT EXISTS maps_au AFTER UPDATE OF title,artist,creator,version,tags,source ON maps BEGIN
 INSERT INTO maps_fts(maps_fts,rowid,title,artist,creator,version,tags,source) VALUES('delete',old.rowid,old.title,old.artist,old.creator,old.version,old.tags,old.source);
 INSERT INTO maps_fts(rowid,title,artist,creator,version,tags,source) VALUES(new.rowid,new.title,new.artist,new.creator,new.version,new.tags,new.source);
END;
CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY, name TEXT NOT NULL, source TEXT NOT NULL, UNIQUE(name,source));
CREATE TABLE IF NOT EXISTS collection_members (collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE, checksum TEXT NOT NULL, PRIMARY KEY(collection_id,checksum));
CREATE INDEX IF NOT EXISTS collection_hash ON collection_members(checksum);
CREATE TABLE IF NOT EXISTS plays (id INTEGER PRIMARY KEY, checksum TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT NOT NULL, outcome TEXT NOT NULL, mods TEXT NOT NULL, client TEXT NOT NULL, accuracy REAL NOT NULL, combo INTEGER NOT NULL, misses INTEGER NOT NULL, slider_breaks INTEGER NOT NULL, pp REAL NOT NULL, ur REAL NOT NULL, duration INTEGER NOT NULL, events TEXT NOT NULL, map_info TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS plays_map ON plays(checksum,started_at);
CREATE TABLE IF NOT EXISTS analyses (cache_key TEXT PRIMARY KEY, checksum TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS discovery (query_key TEXT PRIMARY KEY, cursor TEXT, fetched_at TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS catalog_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
const columns = new Set((db.prepare('PRAGMA table_info(maps)').all() as { name: string }[]).map(column => column.name));
for (const name of ['asset_root', 'audio_name', 'background_name']) {
  if (!columns.has(name)) db.exec(`ALTER TABLE maps ADD COLUMN ${name} TEXT`);
}
db.pragma('user_version = 2');
let activeLibrary: LibrarySelection = { client: 'lazer', osuPath: '', songsPath: '' };
const libraryKey = (input: LibrarySelection) => JSON.stringify(input);
const collectionSource = () => `${activeLibrary.client}:${activeLibrary.osuPath || activeLibrary.songsPath}`;
const legacyCollectionSource = () => activeLibrary.client === 'stable' ? activeLibrary.osuPath : '';
function selectLibrary(input: LibrarySelection) {
  const normalized = { client: input.client, osuPath: input.osuPath ? path.resolve(input.osuPath) : '', songsPath: input.client === 'stable' && input.songsPath ? path.resolve(input.songsPath) : '' };
  const key = libraryKey(normalized);
  const old = db.prepare('SELECT value FROM catalog_state WHERE key=?').get('active_library') as { value: string } | undefined;
  if (old?.value !== key) {
    if (job.running) throw new Error('Attendre la fin de l’indexation avant de changer de bibliothèque.');
    db.transaction(() => {
      db.prepare('UPDATE maps SET local=0 WHERE local=1').run();
      db.prepare('INSERT OR REPLACE INTO catalog_state(key,value) VALUES(?,?)').run('active_library', key);
    })();
    job = { running: false, phase: 'idle', processed: 0, total: 0, errors: 0, message: `Profil ${input.client} sélectionné. Indexer cette bibliothèque pour afficher les maps installées.` };
    progress();
  }
  activeLibrary = normalized;
}
let job: Job = { running: false, phase: 'idle', processed: 0, total: 0, errors: 0, message: 'Aucune indexation effectuée.' };
function progress() { parentPort!.postMessage({ event: 'index', data: job }); }
type Row = Record<string, any>;
const collectionNames = db.prepare('SELECT c.name FROM collections c JOIN collection_members cm ON cm.collection_id=c.id WHERE cm.checksum=? AND (c.source=? OR c.source=?) ORDER BY c.name');
function mapRow(row: Row): Beatmap {
  return {
    key: row.checksum, checksum: row.checksum, beatmapId: row.beatmap_id, setId: row.set_id,
    title: row.title, artist: row.artist, creator: row.creator, version: row.version, mode: row.mode,
    status: row.status, stars: row.stars, bpm: row.bpm, length: row.length, ar: row.ar, od: row.od, cs: row.cs, hp: row.hp,
    objects: row.objects, local: !!row.local, hasBackground: !!row.local && !!row.background_path, cover: row.cover,
    played: !!row.played, lastPlayed: row.last_played, playCount: row.play_count, tags: row.tags, source: row.source,
    collections: (collectionNames.all(row.checksum, collectionSource(), legacyCollectionSource()) as Row[]).map(v => v.name),
  };
}
function playRow(row: Row): Play {
  const info = JSON.parse(row.map_info);
  return { id: row.id, checksum: row.checksum, title: info.title || 'Map inconnue', artist: info.artist || '', version: info.version || '', partial: !!info.partial, sourceConfirmed: info.sourceConfirmed, snapshot: info.snapshot, startedAt: row.started_at, endedAt: row.ended_at, outcome: row.outcome, mods: row.mods, client: row.client, accuracy: row.accuracy, combo: row.combo, misses: row.misses, sliderBreaks: row.slider_breaks, pp: row.pp, ur: row.ur, duration: row.duration, events: JSON.parse(row.events) };
}
async function* walk(folder: string): AsyncGenerator<string> {
  const entries = await readdir(folder, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.osu')) yield file;
  }
}
const insertMap = db.prepare(`INSERT INTO maps(checksum,beatmap_id,set_id,set_key,title,artist,creator,version,mode,status,stars,bpm,length,ar,od,cs,hp,objects,tags,source,local,played,last_played,file_path,background_path,audio_path,preview,file_size,file_mtime,generation,indexed_at)
VALUES(@checksum,@beatmap_id,@set_id,@set_key,@title,@artist,@creator,@version,@mode,@status,@stars,@bpm,@length,@ar,@od,@cs,@hp,@objects,@tags,@source,1,@played,@last_played,@file_path,@background_path,@audio_path,@preview,@file_size,@file_mtime,@generation,@indexed_at)
ON CONFLICT(checksum) DO UPDATE SET beatmap_id=excluded.beatmap_id,set_id=excluded.set_id,set_key=excluded.set_key,title=excluded.title,artist=excluded.artist,creator=excluded.creator,version=excluded.version,mode=excluded.mode,
status=CASE WHEN excluded.status='unknown' THEN maps.status ELSE excluded.status END, stars=COALESCE(excluded.stars,maps.stars),bpm=excluded.bpm,length=excluded.length,ar=excluded.ar,od=excluded.od,cs=excluded.cs,hp=excluded.hp,objects=excluded.objects,tags=excluded.tags,source=excluded.source,
local=1,played=MAX(maps.played,excluded.played),last_played=COALESCE(excluded.last_played,maps.last_played),file_path=excluded.file_path,background_path=excluded.background_path,audio_path=excluded.audio_path,preview=excluded.preview,file_size=excluded.file_size,file_mtime=excluded.file_mtime,generation=excluded.generation,indexed_at=excluded.indexed_at`);
async function indexStableLibrary(input: LibrarySelection) {
  const root = await realpath(input.songsPath || path.join(input.osuPath, 'Songs'));
  if (!(await stat(root)).isDirectory()) throw new Error('Dossier Songs introuvable.');
  const generation = randomUUID(); const warnings: string[] = [];
  let database = new Map<string, StableEntry>();
  try { database = await readStableDatabase(path.join(input.osuPath, 'osu!.db')); }
  catch (e) { warnings.push(`osu!.db : ${(e as Error).message}`); }
  job.phase = 'maps'; progress();
  const seen = db.prepare('UPDATE maps SET local=1,generation=? WHERE file_path=?');
  const previous = db.prepare('SELECT * FROM maps WHERE file_path=? LIMIT 1');
  const metadata = db.prepare('UPDATE maps SET status=?,stars=COALESCE(?,stars),played=MAX(played,?),last_played=COALESCE(?,last_played) WHERE checksum=?');
  for await (const file of walk(root)) {
    job.total++; seen.run(generation, file);
    try {
      const info = await stat(file); const old = previous.get(file) as Row | undefined;
      if (old && old.file_size === info.size && old.file_mtime === info.mtimeMs) {
        const meta = database.get(old.checksum); if (meta) metadata.run(meta.status, meta.stars, meta.played ? 1 : 0, meta.lastPlayed, old.checksum);
      } else {
        if (info.size > 16 * 1024 * 1024) throw new Error('Fichier .osu trop volumineux.');
        const bytes = await readFile(file); const checksum = createHash('md5').update(bytes).digest('hex');
        const m = parseOsu(bytes.toString('utf8'), path.dirname(file)); const meta = database.get(checksum);
        if (m.beatmapId) db.prepare("DELETE FROM maps WHERE checksum=? AND local=0").run(`remote:${m.beatmapId}`);
        insertMap.run({ checksum, beatmap_id: m.beatmapId, set_id: m.setId, set_key: m.setId ? `set:${m.setId}` : `folder:${path.dirname(file)}`, title: m.title, artist: m.artist, creator: m.creator, version: m.version, mode: m.mode,
          status: meta?.status || 'unknown', stars: meta?.stars ?? null, bpm: m.bpm, length: m.length, ar: m.ar, od: m.od, cs: m.cs, hp: m.hp, objects: m.objects, tags: m.tags, source: m.source,
          played: meta?.played ? 1 : 0, last_played: meta?.lastPlayed || null, file_path: file, background_path: m.background, audio_path: m.audio, preview: m.preview,
          file_size: info.size, file_mtime: info.mtimeMs, generation, indexed_at: new Date().toISOString() });
        db.prepare('UPDATE maps SET local=0 WHERE file_path=? AND checksum!=?').run(file, checksum);
      }
      db.prepare('UPDATE maps SET asset_root=?,audio_name=NULL,background_name=NULL WHERE file_path=? AND local=1').run(path.dirname(file), file);
    } catch (error) { job.errors++; if (warnings.length < 12) warnings.push(`${path.basename(file)} : ${(error as Error).message}`); }
    job.processed++;
    if (job.processed % 100 === 0) { progress(); await new Promise(resolve => setTimeout(resolve, 15)); }
  }
  // Mark disappeared files only after a complete successful directory traversal.
  db.prepare('UPDATE maps SET local=0 WHERE local=1 AND (generation IS NULL OR generation!=?)').run(generation);
  job.phase = 'collections'; progress();
  try {
    const collections = await readCollections(path.join(input.osuPath, 'collection.db'));
    db.transaction(() => {
      db.prepare('DELETE FROM collections WHERE source=? OR source=?').run(collectionSource(), legacyCollectionSource());
      const collection = db.prepare('INSERT INTO collections(name,source) VALUES(?,?)');
      const member = db.prepare('INSERT OR IGNORE INTO collection_members(collection_id,checksum) VALUES(?,?)');
      for (const c of collections) { const id = collection.run(c.name, collectionSource()).lastInsertRowid; for (const hash of c.hashes) member.run(id, hash); }
    })();
  } catch (error) { warnings.push(`Collections : ${(error as Error).message}`); }
  job = { ...job, running: false, phase: 'done', finishedAt: new Date().toISOString(), message: warnings.length ? `${job.processed} fichiers parcourus. ${warnings.join(' · ')}` : `${job.processed} difficultés indexées avec leurs collections.` }; progress();
}

async function indexLazerLibrary(input: LibrarySelection) {
  const library = await openLazerLibrary(input.osuPath, path.join(workerData.dataDir, 'snapshots'));
  const generation = randomUUID(), warnings: string[] = [];
  try {
    job.phase = 'maps'; job.message = `Lecture de ${path.basename(library.file)} · schéma ${library.version}`; progress();
    for (const entry of library.maps) {
      if (!entry.BeatmapSet || entry.BeatmapSet.DeletePending) continue;
      job.total++;
      try {
        const map = await readLazerMap(entry, library.filesRoot), m = map.parsed;
        if (m.beatmapId) db.prepare('DELETE FROM maps WHERE checksum=? AND local=0').run(`remote:${m.beatmapId}`);
        insertMap.run({ checksum: map.checksum, beatmap_id: m.beatmapId, set_id: m.setId, set_key: map.setKey,
          title: m.title, artist: m.artist, creator: m.creator, version: m.version, mode: m.mode, status: map.status, stars: map.stars,
          bpm: m.bpm, length: m.length, ar: m.ar, od: m.od, cs: m.cs, hp: m.hp, objects: m.objects, tags: m.tags, source: m.source,
          played: 0, last_played: null, file_path: map.file, background_path: m.background, audio_path: m.audio, preview: m.preview,
          file_size: map.size, file_mtime: map.mtime, generation, indexed_at: new Date().toISOString() });
        db.prepare('UPDATE maps SET asset_root=?,audio_name=?,background_name=? WHERE checksum=?').run(map.root, map.audioName, map.backgroundName, map.checksum);
      } catch (error) {
        job.errors++; if (warnings.length < 12) warnings.push((error as Error).message);
      }
      job.processed++;
      if (job.processed % 100 === 0) { progress(); await new Promise(resolve => setTimeout(resolve, 15)); }
    }
    const collections = library.collections();
    db.transaction(() => {
      db.prepare('UPDATE maps SET local=0 WHERE local=1 AND (generation IS NULL OR generation!=?)').run(generation);
      db.prepare('DELETE FROM collections WHERE source=?').run(collectionSource());
      const insert = db.prepare('INSERT INTO collections(name,source) VALUES(?,?)');
      const member = db.prepare('INSERT OR IGNORE INTO collection_members(collection_id,checksum) VALUES(?,?)');
      for (const collection of collections) {
        const id = insert.run(collection.name, collectionSource()).lastInsertRowid;
        for (const hash of collection.hashes) member.run(id, hash.toLowerCase());
      }
    })();
  } finally { await library.close(); }
  job = { ...job, running: false, phase: 'done', finishedAt: new Date().toISOString(), message: `${job.processed} difficultés lazer parcourues · schéma ${library.version}.${warnings.length ? ' ' + warnings.join(' · ') : ''}` }; progress();
}

const methods: Record<string, (input: any) => any> = {
  selectLibrary,
  status() {
    const counts = db.prepare('SELECT COUNT(*) maps,SUM(local) installed,COUNT(DISTINCT CASE WHEN local=1 THEN set_key END) sets FROM maps').get() as Row;
    return { ...counts, installed: counts.installed || 0, collections: (db.prepare('SELECT COUNT(*) n FROM collections WHERE source=? OR source=?').get(collectionSource(), legacyCollectionSource()) as Row).n, plays: (db.prepare('SELECT COUNT(*) n FROM plays').get() as Row).n,
      modes: (db.prepare('SELECT DISTINCT mode FROM maps WHERE local=1 ORDER BY mode').all() as Row[]).map(x => x.mode), index: job };
  },
  search(input: SearchInput) {
    const query = compileSearch(input); const limit = Math.max(1, Math.min(100, input.limit || 48)); const page = Math.max(1, input.page || 1);
    const total = (db.prepare(`SELECT COUNT(*) n FROM maps m WHERE ${query.clause}`).get(...query.params) as Row).n;
    if (input.group === 'sets') {
      const totalSets = (db.prepare(`SELECT COUNT(DISTINCT m.set_key) n FROM maps m WHERE ${query.clause}`).get(...query.params) as Row).n;
      // Order each set by its first matching difficulty under the requested sort.
      const sets = db.prepare(`SELECT m.set_key FROM (
        SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.set_key ORDER BY ${query.order},m.checksum) AS position
        FROM maps m WHERE ${query.clause}
      ) m WHERE m.position=1 ORDER BY ${query.order},m.checksum LIMIT ? OFFSET ?`).all(...query.params, limit, (page - 1) * limit) as Row[];
      const grouped = new Map<string, Beatmap[]>(sets.map(row => [row.set_key, []]));
      if (sets.length) {
        const rows = db.prepare(`SELECT m.* FROM maps m WHERE ${query.clause}
          AND m.set_key IN (${sets.map(() => '?').join(',')}) ORDER BY ${query.order},m.checksum`).all(...query.params, ...sets.map(row => row.set_key)) as Row[];
        for (const row of rows) grouped.get(row.set_key)!.push(mapRow(row));
      }
      const groups = [...grouped.values()];
      return { maps: groups.flat(), groups, total, totalSets, page, pages: Math.ceil(totalSets / limit) };
    }
    const rows = db.prepare(`SELECT m.* FROM maps m WHERE ${query.clause} ORDER BY ${query.order},m.checksum LIMIT ? OFFSET ?`).all(...query.params, limit, (page - 1) * limit) as Row[];
    return { maps: rows.map(mapRow), total, page, pages: Math.ceil(total / limit) };
  },
  collections() {
    return db.prepare('SELECT c.id,c.name,COUNT(cm.checksum) total,COUNT(CASE WHEN m.local=1 THEN 1 END) installed FROM collections c LEFT JOIN collection_members cm ON cm.collection_id=c.id LEFT JOIN maps m ON m.checksum=cm.checksum WHERE c.source=? OR c.source=? GROUP BY c.id ORDER BY c.name').all(collectionSource(), legacyCollectionSource());
  },
  detail(key: string) {
    const row = db.prepare('SELECT * FROM maps WHERE checksum=?').get(key) as Row | undefined;
    if (!row) throw new Error('Map introuvable.');
    return { map: mapRow(row), difficulties: (db.prepare('SELECT * FROM maps WHERE set_key=? ORDER BY stars,version').all(row.set_key) as Row[]).map(mapRow), plays: (db.prepare('SELECT * FROM plays WHERE checksum=? ORDER BY started_at DESC LIMIT 30').all(key) as Row[]).map(playRow), preview: row.preview };
  },
  file(input: { key: string; kind: string }) {
    const row = db.prepare('SELECT * FROM maps WHERE checksum=? AND local=1').get(input.key) as Row | undefined;
    if (!row) throw new Error('Map non installée.');
    const fields: Record<string, string> = { background: 'background_path', audio: 'audio_path', beatmap: 'file_path' };
    if (!fields[input.kind] || !row[fields[input.kind]]) throw new Error('Fichier indisponible.');
    const names: Record<string, string> = { background: 'background_name', audio: 'audio_name' };
    return { path: row[fields[input.kind]], folder: row.asset_root || path.dirname(row.file_path), name: input.kind === 'beatmap' ? 'beatmap.osu' : row[names[input.kind]] || path.basename(row[fields[input.kind]]) };
  },
  cover(key: string) { const row = db.prepare('SELECT cover FROM maps WHERE checksum=?').get(key) as Row | undefined; return row?.cover || null; },
  index(input: LibrarySelection) {
    if (job.running) return job;
    selectLibrary(input);
    if (!activeLibrary.osuPath && !activeLibrary.songsPath) throw new Error(`Configurer le dossier de données osu!${input.client} dans les réglages.`);
    job = { running: true, phase: 'prepare', processed: 0, total: 0, errors: 0, message: 'Lecture de la bibliothèque…' }; progress();
    void (input.client === 'lazer' ? indexLazerLibrary(activeLibrary) : indexStableLibrary(activeLibrary)).catch(error => { job = { ...job, running: false, phase: 'error', message: error.message }; progress(); });
    return job;
  },
  plays() { return (db.prepare('SELECT * FROM plays ORDER BY started_at DESC LIMIT 100').all() as Row[]).map(playRow); },
  savePlay(input: Omit<Play, 'id'>) {
    const info = JSON.stringify({ title: input.title, artist: input.artist, version: input.version, partial: !!input.partial, sourceConfirmed: input.sourceConfirmed, snapshot: input.snapshot });
    const row = db.prepare('INSERT INTO plays(checksum,started_at,ended_at,outcome,mods,client,accuracy,combo,misses,slider_breaks,pp,ur,duration,events,map_info) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(input.checksum, input.startedAt, input.endedAt, input.outcome, input.mods, input.client, input.accuracy, input.combo, input.misses, input.sliderBreaks, input.pp, input.ur, input.duration, JSON.stringify(input.events), info);
    db.prepare('UPDATE maps SET played=1,last_played=?,play_count=play_count+1 WHERE checksum=?').run(input.endedAt, input.checksum);
    return Number(row.lastInsertRowid);
  },
  analysisGet(key: string) { const r = db.prepare('SELECT result FROM analyses WHERE cache_key=?').get(key) as Row | undefined; return r ? JSON.parse(r.result) : null; },
  analysisPut(input: { key: string; checksum: string; result: any }) {
    db.prepare('INSERT OR REPLACE INTO analyses(cache_key,checksum,result,created_at) VALUES(?,?,?,?)').run(input.key, input.checksum, JSON.stringify(input.result), new Date().toISOString());
    if (input.result.mods === 'NM') db.prepare('UPDATE maps SET stars=? WHERE checksum=?').run(input.result.stars, input.checksum);
  },
  discoveryGet(key: string) { return db.prepare('SELECT * FROM discovery WHERE query_key=?').get(key) || null; },
  discoveryPut(input: { key: string; cursor: string | null; total: number }) { db.prepare('INSERT OR REPLACE INTO discovery(query_key,cursor,fetched_at,total) VALUES(?,?,?,?)').run(input.key, input.cursor, new Date().toISOString(), input.total); },
  remoteUpsert(sets: Row[]) {
    const stmt = db.prepare(`INSERT INTO maps(checksum,beatmap_id,set_id,set_key,title,artist,creator,version,mode,status,stars,bpm,length,ar,od,cs,hp,objects,tags,source,cover,indexed_at,fetched_at)
      VALUES(@checksum,@beatmap_id,@set_id,@set_key,@title,@artist,@creator,@version,@mode,@status,@stars,@bpm,@length,@ar,@od,@cs,@hp,@objects,@tags,@source,@cover,@indexed_at,@fetched_at)
      ON CONFLICT(checksum) DO UPDATE SET status=excluded.status,cover=excluded.cover,fetched_at=excluded.fetched_at,stars=CASE WHEN maps.local=0 THEN excluded.stars ELSE maps.stars END`);
    let n = 0;
    db.transaction(() => {
      for (const set of sets) for (const map of set.beatmaps || []) {
        const checksum = map.checksum || `remote:${map.id}`; const existing = db.prepare('SELECT checksum FROM maps WHERE beatmap_id=? AND local=1 LIMIT 1').get(map.id) as Row | undefined;
        const key = !map.checksum && existing ? existing.checksum : checksum;
        const now = new Date().toISOString();
        stmt.run({ checksum: key, beatmap_id: map.id, set_id: set.id, set_key: `set:${set.id}`, title: set.title_unicode || set.title || '', artist: set.artist_unicode || set.artist || '', creator: set.creator || '', version: map.version || '', mode: map.mode_int ?? 0, status: map.status || set.status || 'unknown', stars: map.difficulty_rating ?? null, bpm: map.bpm ?? set.bpm ?? null, length: map.hit_length ?? map.total_length ?? 0, ar: map.ar ?? 5, od: map.accuracy ?? 5, cs: map.cs ?? 5, hp: map.drain ?? 5, objects: (map.count_circles || 0) + (map.count_sliders || 0) + (map.count_spinners || 0), tags: set.tags || '', source: set.source || '', cover: set.covers?.cover || null, indexed_at: now, fetched_at: now }); n++;
      }
    })(); return n;
  },
  recommend(input: { source: string; target: number; mode: string; q: string; collection: string; objective: string }) {
    const query = compileSearch({ source: input.source as any, mode: input.mode, q: input.q, collection: input.collection });
    const effectiveTarget = input.objective === 'training' ? input.target + 0.25 : input.target;
    const rows = db.prepare(`SELECT m.* FROM maps m WHERE ${query.clause} AND m.stars IS NOT NULL ${input.objective === 'improve' ? 'AND m.played=1' : ''} ORDER BY ABS(m.stars-?),m.play_count ASC LIMIT 200`).all(...query.params, effectiveTarget) as Row[];
    const recent = new Set((db.prepare('SELECT checksum FROM plays WHERE started_at > ?').all(new Date(Date.now() - 86400000).toISOString()) as Row[]).map(x => x.checksum));
    const scored = rows.map(row => ({ row, score: Math.abs(row.stars - effectiveTarget) * 2 + (row.played ? (input.objective === 'discovery' ? 0.8 : 0.2) : -0.2) + (recent.has(row.checksum) ? 1 : 0) + (input.objective === 'farm' ? Math.max(0, row.length - 180) / 600 : 0) }));
    scored.sort((a, b) => a.score - b.score); const sets = new Set<string>(); const results: Beatmap[] = [];
    for (const { row } of scored) { if (sets.has(row.set_key)) continue; sets.add(row.set_key); const map = mapRow(row); map.reason = `${Math.abs(row.stars - input.target) < 0.35 ? 'Difficulté proche de ta cible' : 'Dans ta plage de difficulté'} · ${row.played ? 'déjà jouée' : 'aucun play connu'} · ${Math.round(row.length)} s`; results.push(map); if (results.length === 5) break; }
    return { maps: results, basis: 'difficulty-baseline', target: input.target, note: 'Sélection basée sur la difficulté NM et la diversité. La probabilité de réussite et le gain pondéré de PP ne sont pas encore modélisés.' };
  },
};
parentPort!.on('message', async (message: { id: number; method: string; input: any }) => {
  try { if (!methods[message.method]) throw new Error('Méthode inconnue.'); const result = await methods[message.method](message.input); parentPort!.postMessage({ id: message.id, result }); }
  catch (error) { parentPort!.postMessage({ id: message.id, error: (error as Error).message }); }
});
parentPort!.postMessage({ event: 'ready' });
