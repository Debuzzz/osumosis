import type { createAnalysisRepository } from "../analysis/repository";
import type { createCatalogRepository } from "../catalog/repository";
import type { createCollectionsRepository } from "../collections/repository";
import type { createDiscoveryRepository } from "../discovery/repository";
import type { createLibraryService } from "../library/service";
import type { createMapsRepository } from "../maps/repository";
import type { createPlaysRepository } from "../plays/repository";
import type { createRecommendationsRepository } from "../recommendations/repository";
export type CatalogMethods = ReturnType<typeof createLibraryService> &
  ReturnType<typeof createCatalogRepository> &
  ReturnType<typeof createMapsRepository> &
  ReturnType<typeof createCollectionsRepository> &
  ReturnType<typeof createPlaysRepository> &
  ReturnType<typeof createAnalysisRepository> &
  ReturnType<typeof createDiscoveryRepository> &
  ReturnType<typeof createRecommendationsRepository>;
export type CatalogMethod = keyof CatalogMethods;
export type CatalogResult<K extends CatalogMethod> = Awaited<ReturnType<CatalogMethods[K]>>;
export interface WorkerRequest {
  id: number;
  method: CatalogMethod;
  input: unknown;
}
