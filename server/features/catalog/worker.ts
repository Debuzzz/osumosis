import { parentPort, workerData } from "node:worker_threads";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import { openCatalogDatabase } from "../../infrastructure/database";
import { createAnalysisRepository } from "../analysis/repository";
import { createCatalogRepository } from "../catalog/repository";
import { createCollectionsRepository } from "../collections/repository";
import { createDiscoveryRepository } from "../discovery/repository";
import { createLibraryService } from "../library/service";
import { createMapsRepository } from "../maps/repository";
import { createPlaysRepository } from "../plays/repository";
import { createRecommendationsRepository } from "../recommendations/repository";
import type { CatalogMethods, WorkerRequest } from "./model";
const context: CatalogContext = {
  db: await openCatalogDatabase(workerData.dataDir),
  dataDir: workerData.dataDir,
  library: { client: "lazer", osuPath: "", songsPath: "" },
  job: {
    running: false,
    phase: "idle",
    processed: 0,
    total: 0,
    errors: 0,
    message: "Aucune indexation effectuée.",
  },
  emitProgress: () => parentPort!.postMessage({ event: "index", data: context.job }),
};
const methods: CatalogMethods = {
  ...createLibraryService(context),
  ...createCatalogRepository(context),
  ...createMapsRepository(context),
  ...createCollectionsRepository(context),
  ...createPlaysRepository(context),
  ...createAnalysisRepository(context),
  ...createDiscoveryRepository(context),
  ...createRecommendationsRepository(context),
};
parentPort!.on("message", async (message: WorkerRequest) => {
  try {
    if (!Object.hasOwn(methods, message.method)) throw new Error("Méthode inconnue.");
    const invoke = methods[message.method] as (input: unknown) => unknown;
    const result = await invoke(message.input);
    parentPort!.postMessage({ id: message.id, result });
  } catch (error) {
    parentPort!.postMessage({ id: message.id, error: (error as Error).message });
  }
});
parentPort!.postMessage({ event: "ready" });
