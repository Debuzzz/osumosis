import type { CatalogContext } from "../../infrastructure/catalog-context";
import {
  legacyCollectionSource as legacyFor,
  collectionSource as sourceFor,
} from "../library/model";
export function createCatalogRepository(context: CatalogContext) {
  const db = context.db;
  const collectionSource = () => sourceFor(context.library);
  const legacyCollectionSource = () => legacyFor(context.library);
  return {
    status() {
      const counts = db
        .prepare(
          "SELECT COUNT(*) maps,SUM(local) installed,COUNT(DISTINCT CASE WHEN local=1 THEN set_key END) sets FROM maps",
        )
        .get() as { maps: number; installed: number | null; sets: number };
      return {
        ...counts,
        installed: counts.installed || 0,
        collections: (
          db
            .prepare("SELECT COUNT(*) n FROM collections WHERE source=? OR source=?")
            .get(collectionSource(), legacyCollectionSource()) as { n: number }
        ).n,
        plays: (db.prepare("SELECT COUNT(*) n FROM plays").get() as { n: number }).n,
        modes: (
          db.prepare("SELECT DISTINCT mode FROM maps WHERE local=1 ORDER BY mode").all() as {
            mode: number;
          }[]
        ).map((x) => x.mode),
        index: context.job,
      };
    },
  };
}
