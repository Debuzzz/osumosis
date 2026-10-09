import type { CatalogContext } from "../../infrastructure/catalog-context";
import type { DiscoveryCache, RemoteSet } from "./model";
export function createDiscoveryRepository(context: CatalogContext) {
  const db = context.db;
  return {
    discoveryGet(key: string) {
      return (
        (db.prepare("SELECT * FROM discovery WHERE query_key=?").get(key) as
          DiscoveryCache | undefined) || null
      );
    },
    discoveryPut(input: { key: string; cursor: string | null; total: number }) {
      db.prepare(
        "INSERT OR REPLACE INTO discovery(query_key,cursor,fetched_at,total) VALUES(?,?,?,?)",
      ).run(input.key, input.cursor, new Date().toISOString(), input.total);
    },
    remoteUpsert(sets: RemoteSet[]) {
      const stmt =
        db.prepare(`INSERT INTO maps(checksum,beatmap_id,set_id,set_key,title,artist,creator,version,mode,status,stars,bpm,length,ar,od,cs,hp,objects,tags,source,cover,indexed_at,fetched_at)
      VALUES(@checksum,@beatmap_id,@set_id,@set_key,@title,@artist,@creator,@version,@mode,@status,@stars,@bpm,@length,@ar,@od,@cs,@hp,@objects,@tags,@source,@cover,@indexed_at,@fetched_at)
      ON CONFLICT(checksum) DO UPDATE SET status=excluded.status,cover=excluded.cover,fetched_at=excluded.fetched_at,stars=CASE WHEN maps.local=0 THEN excluded.stars ELSE maps.stars END`);
      let n = 0;
      db.transaction(() => {
        for (const set of sets)
          for (const map of set.beatmaps || []) {
            const checksum = map.checksum || `remote:${map.id}`;
            const existing = db
              .prepare("SELECT checksum FROM maps WHERE beatmap_id=? AND local=1 LIMIT 1")
              .get(map.id) as { checksum: string } | undefined;
            const key = !map.checksum && existing ? existing.checksum : checksum;
            const now = new Date().toISOString();
            stmt.run({
              checksum: key,
              beatmap_id: map.id,
              set_id: set.id,
              set_key: `set:${set.id}`,
              title: set.title_unicode || set.title || "",
              artist: set.artist_unicode || set.artist || "",
              creator: set.creator || "",
              version: map.version || "",
              mode: map.mode_int ?? 0,
              status: map.status || set.status || "unknown",
              stars: map.difficulty_rating ?? null,
              bpm: map.bpm ?? set.bpm ?? null,
              length: map.hit_length ?? map.total_length ?? 0,
              ar: map.ar ?? 5,
              od: map.accuracy ?? 5,
              cs: map.cs ?? 5,
              hp: map.drain ?? 5,
              objects:
                (map.count_circles || 0) + (map.count_sliders || 0) + (map.count_spinners || 0),
              tags: set.tags || "",
              source: set.source || "",
              cover: set.covers?.cover || null,
              indexed_at: now,
              fetched_at: now,
            });
            n++;
          }
      })();
      return n;
    },
  };
}
