import Database from "better-sqlite3";
import { mkdir } from "node:fs/promises";
import path from "node:path";
export async function openCatalogDatabase(dataDir: string) {
  await mkdir(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "catalog.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
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
  const columns = new Set(
    (db.prepare("PRAGMA table_info(maps)").all() as { name: string }[]).map(
      (column) => column.name,
    ),
  );
  for (const name of ["asset_root", "audio_name", "background_name"]) {
    if (!columns.has(name)) db.exec(`ALTER TABLE maps ADD COLUMN ${name} TEXT`);
  }
  db.pragma("user_version = 2");
  return db;
}
