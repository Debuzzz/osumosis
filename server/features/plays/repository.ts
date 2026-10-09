import type { Play } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import { playRow } from "../plays/model";
import type { PlayRow } from "./storage-model";
export function createPlaysRepository(context: CatalogContext) {
  const db = context.db;
  return {
    plays() {
      return (
        db.prepare("SELECT * FROM plays ORDER BY started_at DESC LIMIT 100").all() as PlayRow[]
      ).map(playRow);
    },
    savePlay(input: Omit<Play, "id">) {
      const info = JSON.stringify({
        title: input.title,
        artist: input.artist,
        version: input.version,
        partial: !!input.partial,
        sourceConfirmed: input.sourceConfirmed,
        snapshot: input.snapshot,
      });
      const row = db
        .prepare(
          "INSERT INTO plays(checksum,started_at,ended_at,outcome,mods,client,accuracy,combo,misses,slider_breaks,pp,ur,duration,events,map_info) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          input.checksum,
          input.startedAt,
          input.endedAt,
          input.outcome,
          input.mods,
          input.client,
          input.accuracy,
          input.combo,
          input.misses,
          input.sliderBreaks,
          input.pp,
          input.ur,
          input.duration,
          JSON.stringify(input.events),
          info,
        );
      db.prepare(
        "UPDATE maps SET played=1,last_played=?,play_count=play_count+1 WHERE checksum=?",
      ).run(input.endedAt, input.checksum);
      return Number(row.lastInsertRowid);
    },
  };
}
