import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppServices } from "../../core/services";
import { searchSchema } from "./schema";
export function registerMapsApi(app: FastifyInstance, services: Pick<AppServices, "catalog">) {
  const { catalog } = services;
  app.get("/api/maps", (request) => catalog.call("search", searchSchema.parse(request.query)));
  app.get("/api/maps/:key", (request) =>
    catalog.call("detail", z.object({ key: z.string().max(100) }).parse(request.params).key),
  );
}
