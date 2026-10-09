import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AppServices } from "../../core/services";
import { within } from "../../infrastructure/paths";
export function registerMediaApi(
  app: FastifyInstance,
  services: Pick<AppServices, "catalog" | "covers">,
) {
  const { catalog, covers } = services;
  app.get("/api/covers/:key", async (request, reply) => {
    const { key } = z.object({ key: z.string().max(100) }).parse(request.params);
    const { fetch: allow } = z
      .object({ fetch: z.enum(["0", "1"]).default("0") })
      .parse(request.query);
    try {
      const url = await catalog.call("cover", key);
      if (!url) return reply.code(404).send({ error: "Miniature indisponible." });
      const asset = await covers.get(url, allow === "1");
      reply
        .type(asset.mime)
        .header("Cache-Control", "private, max-age=86400")
        .header("X-Content-Type-Options", "nosniff");
      return reply.send(createReadStream(asset.file));
    } catch {
      return reply
        .code(404)
        .send({ error: "Miniature absente du cache ou temporairement indisponible." });
    }
  });
  app.get("/api/assets/:key/:kind", async (request, reply) => {
    const { key, kind } = z
      .object({ key: z.string().max(100), kind: z.enum(["background", "audio", "beatmap"]) })
      .parse(request.params);
    const resource = await catalog.call("file", {
      key,
      kind,
    });
    const file = await realpath(resource.path),
      folder = await realpath(resource.folder);
    if (!within(folder, file))
      return reply.code(403).send({ error: "Fichier hors du dossier autorisé." });
    const info = await stat(file);
    if (!info.isFile()) return reply.code(404).send({ error: "Fichier absent." });
    const extension = path.extname(resource.name).toLowerCase();
    const mime: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
      ".wav": "audio/wav",
      ".osu": "text/plain",
    };
    reply
      .header("Content-Type", mime[extension] || "application/octet-stream")
      .header("X-Content-Type-Options", "nosniff")
      .header("Cache-Control", "private, max-age=3600")
      .header("Accept-Ranges", "bytes");
    const range = request.headers.range;
    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      let start = match?.[1] ? Number(match[1]) : 0;
      let end = match?.[2] ? Number(match[2]) : info.size - 1;
      if (match && !match[1] && match[2]) {
        start = Math.max(0, info.size - Number(match[2]));
        end = info.size - 1;
      }
      end = Math.min(end, info.size - 1);
      if (!match || start > end || start >= info.size)
        return reply.code(416).header("Content-Range", `bytes */${info.size}`).send();
      reply
        .code(206)
        .header("Content-Range", `bytes ${start}-${end}/${info.size}`)
        .header("Content-Length", end - start + 1);
      return reply.send(createReadStream(file, { start, end }));
    }
    reply.header("Content-Length", info.size);
    return reply.send(createReadStream(file));
  });
}
