import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppServices } from "../../core/services";
export function registerAnalysisApi(
  app: FastifyInstance,
  services: Pick<AppServices, "analyzer" | "settingsService">,
) {
  const { analyzer, settingsService } = services;
  app.post("/api/maps/:key/analysis", (request) => {
    const { key } = z.object({ key: z.string().max(100) }).parse(request.params);
    const { mods } = z
      .object({ mods: z.enum(["NM", "HD", "HR", "DT", "HDDT", "HDHR", "HT", "EZ"]).default("NM") })
      .parse(request.body || {});
    return analyzer.calculate(key, mods, settingsService.current.client);
  });
}
