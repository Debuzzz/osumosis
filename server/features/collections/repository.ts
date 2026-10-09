import type { Collection } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import {
  legacyCollectionSource as legacyFor,
  collectionSource as sourceFor,
} from "../library/model";
export function createCollectionsRepository(context: CatalogContext) {
  const db = context.db;
  const collectionSource = () => sourceFor(context.library);
  const legacyCollectionSource = () => legacyFor(context.library);
  return {
    collections() {
      return db
        .prepare(
          "SELECT c.id,c.name,COUNT(cm.checksum) total,COUNT(CASE WHEN m.local=1 THEN 1 END) installed FROM collections c LEFT JOIN collection_members cm ON cm.collection_id=c.id LEFT JOIN maps m ON m.checksum=cm.checksum WHERE c.source=? OR c.source=? GROUP BY c.id ORDER BY c.name",
        )
        .all(collectionSource(), legacyCollectionSource()) as Collection[];
    },
  };
}
