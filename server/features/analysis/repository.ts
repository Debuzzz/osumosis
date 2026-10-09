import type { Analysis } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
export function createAnalysisRepository(context: CatalogContext) {
  const db = context.db;
  return {
    analysisGet(key: string) {
      const r = db.prepare("SELECT result FROM analyses WHERE cache_key=?").get(key) as
        { result: string } | undefined;
      return r ? (JSON.parse(r.result) as Analysis) : null;
    },
    analysisPut(input: { key: string; checksum: string; result: Analysis }) {
      db.prepare(
        "INSERT OR REPLACE INTO analyses(cache_key,checksum,result,created_at) VALUES(?,?,?,?)",
      ).run(input.key, input.checksum, JSON.stringify(input.result), new Date().toISOString());
      if (input.result.mods === "NM")
        db.prepare("UPDATE maps SET stars=? WHERE checksum=?").run(
          input.result.stars,
          input.checksum,
        );
    },
  };
}
