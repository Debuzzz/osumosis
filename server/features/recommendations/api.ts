import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppServices } from "../../core/services";
import { modeSchema, sourceSchema } from "../maps/schema";
export function registerRecommendationsApi(
  app: FastifyInstance,
  services: Pick<AppServices, "catalog" | "settingsService">,
) {
  const { catalog, settingsService } = services;
  app.post("/api/recommend", (request) => {
    const input = z
      .object({
        source: sourceSchema.default("local"),
        target: z.number().min(0).max(20).default(settingsService.current.targetStars),
        mode: modeSchema.default("any"),
        q: z.string().max(2000).default(""),
        collection: z.string().regex(/^\d*$/).default(""),
        objective: z.enum(["farm", "improve", "discovery", "training"]).default("farm"),
      })
      .parse(request.body);
    return catalog.call("recommend", input);
  });
}
