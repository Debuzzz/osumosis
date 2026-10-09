import type { FastifyInstance } from "fastify";
import type { AppServices } from "../../core/services";
import { selectedLibrary } from "../settings/model";
export function registerLibraryApi(
  app: FastifyInstance,
  services: Pick<AppServices, "catalog" | "settingsService">,
) {
  const { catalog, settingsService } = services;
  app.post("/api/index", () => {
    if (settingsService.saving)
      throw new Error("Attendre la sauvegarde des réglages avant d’indexer.");
    return catalog.call("index", selectedLibrary(settingsService.current));
  });
}
