import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppServices } from "../../core/services";
export function registerTelemetryApi(
  app: FastifyInstance,
  services: Pick<AppServices, "tosu" | "settingsService">,
) {
  const { tosu, settingsService } = services;
  app.get("/api/tosu/diagnostics", async () => ({
    capture: tosu.capture,
    lastSeen: tosu.lastSeen,
    events: [...tosu.diagnostics],
  }));
  app.get("/api/live", async () => tosu.live);
  app.get("/api/live/background", async (request, reply) => {
    const { checksum } = z
      .object({ checksum: z.string().regex(/^[a-f0-9]{32}$/i) })
      .parse(request.query);
    if (tosu.live.map?.checksum !== checksum.toLowerCase())
      return reply.code(404).send({ error: "La map en direct a changé." });
    // Prefer indexed media in the UI; this fallback only contacts the configured local tosu instance.
    const url = new URL(settingsService.current.tosuUrl);
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";
    url.pathname = "/files/beatmap/background";
    try {
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) });
      const mime = response.headers.get("content-type")?.split(";")[0];
      if (
        !response.ok ||
        !mime ||
        !["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif"].includes(mime) ||
        !response.body
      ) {
        await response.body?.cancel();
        return reply.code(404).send({ error: "Fond indisponible auprès de tosu." });
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 16 * 1024 * 1024) {
            await reader.cancel();
            throw new Error("Fond trop volumineux.");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      if (tosu.live.map?.checksum !== checksum.toLowerCase())
        return reply.code(404).send({ error: "La map en direct a changé." });
      return reply
        .type(mime)
        .header("Cache-Control", "no-store")
        .header("X-Content-Type-Options", "nosniff")
        .send(Buffer.concat(chunks));
    } catch {
      return reply.code(404).send({ error: "Fond indisponible auprès de tosu." });
    }
  });
}
