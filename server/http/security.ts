import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { ApiError } from "../core/api-error";
export function registerSecurity(app: FastifyInstance, port: number) {
  app.addHook("onRequest", async (request, reply) => {
    const host = request.headers.host?.split(":")[0];
    if (!["127.0.0.1", "localhost"].includes(host || ""))
      return reply.code(403).send({ error: "Hôte non autorisé." });
    const origin = request.headers.origin;
    if (
      origin &&
      ![
        `http://127.0.0.1:${port}`,
        `http://localhost:${port}`,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
      ].includes(origin)
    )
      return reply.code(403).send({ error: "Origine non autorisée." });
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      request.headers["x-osumosis"] !== "1"
    )
      return reply.code(403).send({ error: "En-tête de session locale manquant." });
  });
  app.setErrorHandler((error, request, reply) => {
    const known = error instanceof ApiError || error instanceof ZodError;
    const message =
      error instanceof ZodError
        ? error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" · ")
        : error instanceof Error
          ? error.message
          : "Erreur du service local.";
    reply
      .code(error instanceof ApiError ? error.statusCode : known ? 400 : 400)
      .send({ error: message || "Erreur du service local." });
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    if (String(reply.getHeader("content-type") || "").includes("text/html"))
      reply
        .header(
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self'; connect-src 'self' ipc: http://ipc.localhost ws://127.0.0.1:" +
            port +
            " ws://localhost:" +
            port +
            "; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        )
        .header("Referrer-Policy", "no-referrer");
    return payload;
  });
}
