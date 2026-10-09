import type { FastifyInstance } from "fastify";
import type { AppServices } from "../../core/services";
import { settingsUpdateSchema } from "./model";
import { detectInstallations, publicSettings } from "./repository";
export function registerSettingsApi(
  app: FastifyInstance,
  services: Pick<AppServices, "settingsService">,
) {
  const { settingsService } = services;
  app.get("/api/settings", async () => ({
    settings: publicSettings(settingsService.current),
    detectedPaths: await detectInstallations(),
  }));
  app.put("/api/settings", async (request) =>
    settingsService.save(settingsUpdateSchema.parse(request.body)),
  );
}
