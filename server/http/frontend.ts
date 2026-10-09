import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export async function registerFrontend(app: FastifyInstance) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../web");
  if (existsSync(root)) {
    await app.register(fastifyStatic, { root, prefix: "/" });
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith("/api/")
        ? reply.code(404).send({ error: "Route introuvable." })
        : reply.sendFile("index.html"),
    );
  } else
    app.get("/", async (_, reply) =>
      reply
        .type("text/html")
        .send(
          '<h1>osu!mosis</h1><p>Frontend en développement : <a href="http://127.0.0.1:5173">ouvrir React</a>.</p>',
        ),
    );
}
