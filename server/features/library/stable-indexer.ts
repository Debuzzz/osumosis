import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { LibrarySelection } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import {
  legacyCollectionSource as legacyFor,
  collectionSource as sourceFor,
} from "../library/model";
import { type MapRow } from "../maps/model";
import { parseOsu } from "./adapters/osu-file";
import { readCollections, readStableDatabase, type StableEntry } from "./adapters/stable";
import { createLocalMapInsert } from "./repository";
export function createStableIndexer(context: CatalogContext) {
  const db = context.db;
  const collectionSource = () => sourceFor(context.library);
  const legacyCollectionSource = () => legacyFor(context.library);
  const insertMap = createLocalMapInsert(db);
  async function* walk(folder: string): AsyncGenerator<string> {
    const entries = await readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) yield* walk(file);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".osu")) yield file;
    }
  }
  return async function indexStableLibrary(input: LibrarySelection) {
    const root = await realpath(input.songsPath || path.join(input.osuPath, "Songs"));
    if (!(await stat(root)).isDirectory()) throw new Error("Dossier Songs introuvable.");
    const generation = randomUUID();
    const warnings: string[] = [];
    let database = new Map<string, StableEntry>();
    try {
      database = await readStableDatabase(path.join(input.osuPath, "osu!.db"));
    } catch (e) {
      warnings.push(`osu!.db : ${(e as Error).message}`);
    }
    context.job.phase = "maps";
    context.emitProgress();
    const seen = db.prepare("UPDATE maps SET local=1,generation=? WHERE file_path=?");
    const previous = db.prepare("SELECT * FROM maps WHERE file_path=? LIMIT 1");
    const metadata = db.prepare(
      "UPDATE maps SET status=?,stars=COALESCE(?,stars),played=MAX(played,?),last_played=COALESCE(?,last_played) WHERE checksum=?",
    );
    for await (const file of walk(root)) {
      context.job.total++;
      seen.run(generation, file);
      try {
        const info = await stat(file);
        const old = previous.get(file) as MapRow | undefined;
        if (old && old.file_size === info.size && old.file_mtime === info.mtimeMs) {
          const meta = database.get(old.checksum);
          if (meta)
            metadata.run(
              meta.status,
              meta.stars,
              meta.played ? 1 : 0,
              meta.lastPlayed,
              old.checksum,
            );
        } else {
          if (info.size > 16 * 1024 * 1024) throw new Error("Fichier .osu trop volumineux.");
          const bytes = await readFile(file);
          const checksum = createHash("md5").update(bytes).digest("hex");
          const m = parseOsu(bytes.toString("utf8"), path.dirname(file));
          const meta = database.get(checksum);
          if (m.beatmapId)
            db.prepare("DELETE FROM maps WHERE checksum=? AND local=0").run(
              `remote:${m.beatmapId}`,
            );
          insertMap.run({
            checksum,
            beatmap_id: m.beatmapId,
            set_id: m.setId,
            set_key: m.setId ? `set:${m.setId}` : `folder:${path.dirname(file)}`,
            title: m.title,
            artist: m.artist,
            creator: m.creator,
            version: m.version,
            mode: m.mode,
            status: meta?.status || "unknown",
            stars: meta?.stars ?? null,
            bpm: m.bpm,
            length: m.length,
            ar: m.ar,
            od: m.od,
            cs: m.cs,
            hp: m.hp,
            objects: m.objects,
            tags: m.tags,
            source: m.source,
            played: meta?.played ? 1 : 0,
            last_played: meta?.lastPlayed || null,
            file_path: file,
            background_path: m.background,
            audio_path: m.audio,
            preview: m.preview,
            file_size: info.size,
            file_mtime: info.mtimeMs,
            generation,
            indexed_at: new Date().toISOString(),
          });
          db.prepare("UPDATE maps SET local=0 WHERE file_path=? AND checksum!=?").run(
            file,
            checksum,
          );
        }
        db.prepare(
          "UPDATE maps SET asset_root=?,audio_name=NULL,background_name=NULL WHERE file_path=? AND local=1",
        ).run(path.dirname(file), file);
      } catch (error) {
        context.job.errors++;
        if (warnings.length < 12)
          warnings.push(`${path.basename(file)} : ${(error as Error).message}`);
      }
      context.job.processed++;
      if (context.job.processed % 100 === 0) {
        context.emitProgress();
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
    }
    // Mark disappeared files only after a complete successful directory traversal.
    db.prepare(
      "UPDATE maps SET local=0 WHERE local=1 AND (generation IS NULL OR generation!=?)",
    ).run(generation);
    context.job.phase = "collections";
    context.emitProgress();
    try {
      const collections = await readCollections(path.join(input.osuPath, "collection.db"));
      db.transaction(() => {
        db.prepare("DELETE FROM collections WHERE source=? OR source=?").run(
          collectionSource(),
          legacyCollectionSource(),
        );
        const collection = db.prepare("INSERT INTO collections(name,source) VALUES(?,?)");
        const member = db.prepare(
          "INSERT OR IGNORE INTO collection_members(collection_id,checksum) VALUES(?,?)",
        );
        for (const c of collections) {
          const id = collection.run(c.name, collectionSource()).lastInsertRowid;
          for (const hash of c.hashes) member.run(id, hash);
        }
      })();
    } catch (error) {
      warnings.push(`Collections : ${(error as Error).message}`);
    }
    context.job = {
      ...context.job,
      running: false,
      phase: "done",
      finishedAt: new Date().toISOString(),
      message: warnings.length
        ? `${context.job.processed} fichiers parcourus. ${warnings.join(" · ")}`
        : `${context.job.processed} difficultés indexées avec leurs collections.`,
    };
    context.emitProgress();
  };
}
