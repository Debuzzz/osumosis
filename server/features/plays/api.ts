import type { FastifyInstance } from "fastify";
import type { AppServices } from "../../core/services";
export function registerPlaysApi(app: FastifyInstance, services: Pick<AppServices, "catalog">) {
  const { catalog } = services;
  app.get("/api/plays", () => catalog.call("plays"));
}
