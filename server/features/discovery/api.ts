import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { searchTokens } from "../../../shared/search-query";
import type { AppServices } from "../../core/services";
import { modeSchema, statusSchema } from "../maps/schema";
export function registerDiscoveryApi(app: FastifyInstance, services: Pick<AppServices, "osu">) {
  const { osu } = services;
  app.post("/api/discover", async (request) => {
    const input = z
      .object({
        q: z.string().max(2000).default(""),
        mode: modeSchema.default("any"),
        status: statusSchema.default("any"),
        more: z.boolean().default(false),
      })
      .parse(request.body);
    // Local-only predicates are applied by the catalogue after discovery.
    const tokens = searchTokens(input.q);
    input.q = tokens
      .filter((t) => !/^(local|played|collection|plays|objects|id)(?:>=|<=|!=|=|>|<|:)/i.test(t))
      .join(" ");
    return osu.discover(input);
  });
}
