import type { Beatmap } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import { createMapMapper, type MapRow } from "../maps/model";
import { compileSearch } from "../maps/search";
export function createRecommendationsRepository(context: CatalogContext) {
  const db = context.db;
  const mapRow = createMapMapper(context);
  return {
    recommend(input: {
      source: import("../../../shared/types").Source;
      target: number;
      mode: string;
      q: string;
      collection: string;
      objective: string;
    }) {
      const query = compileSearch({
        source: input.source,
        mode: input.mode,
        q: input.q,
        collection: input.collection,
      });
      const effectiveTarget = input.objective === "training" ? input.target + 0.25 : input.target;
      const rows = db
        .prepare(
          `SELECT m.* FROM maps m WHERE ${query.clause} AND m.stars IS NOT NULL ${input.objective === "improve" ? "AND m.played=1" : ""} ORDER BY ABS(m.stars-?),m.play_count ASC LIMIT 200`,
        )
        .all(...query.params, effectiveTarget) as (MapRow & { stars: number })[];
      const recent = new Set(
        (
          db
            .prepare("SELECT checksum FROM plays WHERE started_at > ?")
            .all(new Date(Date.now() - 86400000).toISOString()) as { checksum: string }[]
        ).map((x) => x.checksum),
      );
      const scored = rows.map((row) => ({
        row,
        score:
          Math.abs(row.stars - effectiveTarget) * 2 +
          (row.played ? (input.objective === "discovery" ? 0.8 : 0.2) : -0.2) +
          (recent.has(row.checksum) ? 1 : 0) +
          (input.objective === "farm" ? Math.max(0, row.length - 180) / 600 : 0),
      }));
      scored.sort((a, b) => a.score - b.score);
      const sets = new Set<string>();
      const results: Beatmap[] = [];
      for (const { row } of scored) {
        if (sets.has(row.set_key)) continue;
        sets.add(row.set_key);
        const map = mapRow(row);
        map.reason = `${Math.abs(row.stars - input.target) < 0.35 ? "Difficulté proche de ta cible" : "Dans ta plage de difficulté"} · ${row.played ? "déjà jouée" : "aucun play connu"} · ${Math.round(row.length)} s`;
        results.push(map);
        if (results.length === 5) break;
      }
      return {
        maps: results,
        basis: "difficulty-baseline",
        target: input.target,
        note: "Sélection basée sur la difficulté NM et la diversité. La probabilité de réussite et le gain pondéré de PP ne sont pas encore modélisés.",
      };
    },
  };
}
