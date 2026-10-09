import type { FastifyInstance } from "fastify";
import type { AppServices } from "../core/services";
export function registerSystemApi(
  app: FastifyInstance,
  services: Pick<AppServices, "catalog" | "tosu" | "osu">,
) {
  const { catalog, tosu, osu } = services;
  app.get("/api/status", async () => ({
    app: "osumosis",
    ...(await catalog.call("status")),
    tosu: {
      connected: tosu.live.connected,
      lastSeen: tosu.lastSeen,
      error: tosu.capture.error,
      capture: tosu.capture,
    },
    api: osu.status(),
  }));
  app.post("/api/shutdown", async (request, reply) => {
    if (
      process.env.OSUMOSIS_DESKTOP_INSTANCE &&
      request.headers["x-osumosis-instance"] !== process.env.OSUMOSIS_DESKTOP_INSTANCE
    )
      return reply.code(403).send({ error: "Desktop instance mismatch." });
    reply.send({ stopping: true });
    setImmediate(() => {
      void app.close();
    });
  });
}
