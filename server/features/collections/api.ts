import type { FastifyInstance } from "fastify";
import type { AppServices } from "../../core/services";
export function registerCollectionsApi(
  app: FastifyInstance,
  services: Pick<AppServices, "catalog">,
) {
  const { catalog } = services;
  app.get("/api/collections", () => catalog.call("collections"));
}
