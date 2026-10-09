import { randomUUID } from "node:crypto";
import path from "node:path";
import type { LibrarySelection } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import { collectionSource as sourceFor } from "../library/model";
import { openLazerLibrary, readLazerMap } from "./adapters/lazer";
import { createLocalMapInsert } from "./repository";
export function createLazerIndexer(context: CatalogContext) {
  const db = context.db;
  const collectionSource = () => sourceFor(context.library);
  const insertMap = createLocalMapInsert(db);
  return async function indexLazerLibrary(input: LibrarySelection) {
    const library = await openLazerLibrary(input.osuPath, path.join(context.dataDir, "snapshots"));
    const generation = randomUUID(),
      warnings: string[] = [];
    try {
      context.job.phase = "maps";
      context.job.message = `Lecture de ${path.basename(library.file)} · schéma ${library.version}`;
      context.emitProgress();
      for (const entry of library.maps) {
        if (!entry.BeatmapSet || entry.BeatmapSet.DeletePending) continue;
        context.job.total++;
        try {
          const map = await readLazerMap(entry, library.filesRoot),
            m = map.parsed;
          if (m.beatmapId)
            db.prepare("DELETE FROM maps WHERE checksum=? AND local=0").run(
              `remote:${m.beatmapId}`,
            );
          insertMap.run({
            checksum: map.checksum,
            beatmap_id: m.beatmapId,
            set_id: m.setId,
            set_key: map.setKey,
            title: m.title,
            artist: m.artist,
            creator: m.creator,
            version: m.version,
            mode: m.mode,
            status: map.status,
            stars: map.stars,
            bpm: m.bpm,
            length: m.length,
            ar: m.ar,
            od: m.od,
            cs: m.cs,
            hp: m.hp,
            objects: m.objects,
            tags: m.tags,
            source: m.source,
            played: 0,
            last_played: null,
            file_path: map.file,
            background_path: m.background,
            audio_path: m.audio,
            preview: m.preview,
            file_size: map.size,
            file_mtime: map.mtime,
            generation,
            indexed_at: new Date().toISOString(),
          });
          db.prepare(
            "UPDATE maps SET asset_root=?,audio_name=?,background_name=? WHERE checksum=?",
          ).run(map.root, map.audioName, map.backgroundName, map.checksum);
        } catch (error) {
          context.job.errors++;
          if (warnings.length < 12) warnings.push((error as Error).message);
        }
        context.job.processed++;
        if (context.job.processed % 100 === 0) {
          context.emitProgress();
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      }
      const collections = library.collections();
      db.transaction(() => {
        db.prepare(
          "UPDATE maps SET local=0 WHERE local=1 AND (generation IS NULL OR generation!=?)",
        ).run(generation);
        db.prepare("DELETE FROM collections WHERE source=?").run(collectionSource());
        const insert = db.prepare("INSERT INTO collections(name,source) VALUES(?,?)");
        const member = db.prepare(
          "INSERT OR IGNORE INTO collection_members(collection_id,checksum) VALUES(?,?)",
        );
        for (const collection of collections) {
          const id = insert.run(collection.name, collectionSource()).lastInsertRowid;
          for (const hash of collection.hashes) member.run(id, hash.toLowerCase());
        }
      })();
    } finally {
      await library.close();
    }
    context.job = {
      ...context.job,
      running: false,
      phase: "done",
      finishedAt: new Date().toISOString(),
      message: `${context.job.processed} difficultés lazer parcourues · schéma ${library.version}.${warnings.length ? " " + warnings.join(" · ") : ""}`,
    };
    context.emitProgress();
  };
}
