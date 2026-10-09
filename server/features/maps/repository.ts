import path from "node:path";
import type { Beatmap } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import { createMapMapper, type MapRow } from "../maps/model";
import { playRow } from "../plays/model";
import type { PlayRow } from "../plays/storage-model";
import { compileSearch, type SearchInput } from "./search";
export function createMapsRepository(context: CatalogContext) {
  const db = context.db;
  const mapRow = createMapMapper(context);
  return {
    search(input: SearchInput) {
      const query = compileSearch(input);
      const limit = Math.max(1, Math.min(100, input.limit || 48));
      const page = Math.max(1, input.page || 1);
      const total = (
        db.prepare(`SELECT COUNT(*) n FROM maps m WHERE ${query.clause}`).get(...query.params) as {
          n: number;
        }
      ).n;
      if (input.group === "sets") {
        const totalSets = (
          db
            .prepare(`SELECT COUNT(DISTINCT m.set_key) n FROM maps m WHERE ${query.clause}`)
            .get(...query.params) as { n: number }
        ).n;
        // Order each set by its first matching difficulty under the requested sort.
        const sets = db
          .prepare(
            `SELECT m.set_key FROM (
        SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.set_key ORDER BY ${query.order},m.checksum) AS position
        FROM maps m WHERE ${query.clause}
      ) m WHERE m.position=1 ORDER BY ${query.order},m.checksum LIMIT ? OFFSET ?`,
          )
          .all(...query.params, limit, (page - 1) * limit) as MapRow[];
        const grouped = new Map<string, Beatmap[]>(sets.map((row) => [row.set_key, []]));
        if (sets.length) {
          const rows = db
            .prepare(
              `SELECT m.* FROM maps m WHERE ${query.clause}
          AND m.set_key IN (${sets.map(() => "?").join(",")}) ORDER BY ${query.order},m.checksum`,
            )
            .all(...query.params, ...sets.map((row) => row.set_key)) as MapRow[];
          for (const row of rows) grouped.get(row.set_key)!.push(mapRow(row));
        }
        const groups = [...grouped.values()];
        return {
          maps: groups.flat(),
          groups,
          total,
          totalSets,
          page,
          pages: Math.ceil(totalSets / limit),
        };
      }
      const rows = db
        .prepare(
          `SELECT m.* FROM maps m WHERE ${query.clause} ORDER BY ${query.order},m.checksum LIMIT ? OFFSET ?`,
        )
        .all(...query.params, limit, (page - 1) * limit) as MapRow[];
      return { maps: rows.map(mapRow), total, page, pages: Math.ceil(total / limit) };
    },
    detail(key: string) {
      const row = db.prepare("SELECT * FROM maps WHERE checksum=?").get(key) as MapRow | undefined;
      if (!row) throw new Error("Map introuvable.");
      return {
        map: mapRow(row),
        difficulties: (
          db
            .prepare("SELECT * FROM maps WHERE set_key=? ORDER BY stars,version")
            .all(row.set_key) as MapRow[]
        ).map(mapRow),
        plays: (
          db
            .prepare("SELECT * FROM plays WHERE checksum=? ORDER BY started_at DESC LIMIT 30")
            .all(key) as PlayRow[]
        ).map(playRow),
        preview: row.preview,
      };
    },
    file(input: { key: string; kind: string }) {
      const row = db.prepare("SELECT * FROM maps WHERE checksum=? AND local=1").get(input.key) as
        MapRow | undefined;
      if (!row) throw new Error("Map non installée.");
      const fields: Record<string, "background_path" | "audio_path" | "file_path"> = {
        background: "background_path",
        audio: "audio_path",
        beatmap: "file_path",
      };
      const resourcePath = fields[input.kind] && row[fields[input.kind]];
      if (!resourcePath || !row.file_path) throw new Error("Fichier indisponible.");
      const names: Record<string, "background_name" | "audio_name"> = {
        background: "background_name",
        audio: "audio_name",
      };
      return {
        path: resourcePath,
        folder: row.asset_root || path.dirname(row.file_path),
        name:
          input.kind === "beatmap"
            ? "beatmap.osu"
            : row[names[input.kind]] || path.basename(resourcePath),
      };
    },
    cover(key: string) {
      const row = db.prepare("SELECT cover FROM maps WHERE checksum=?").get(key) as
        MapRow | undefined;
      return row?.cover || null;
    },
  };
}
