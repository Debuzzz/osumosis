import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppServices } from "../../core/services";
export function registerAccountApi(
  app: FastifyInstance,
  services: Pick<AppServices, "account" | "broadcast">,
) {
  const { account, broadcast } = services;
  app.get("/api/account", async () => account.status());
  app.post("/api/account/connect", async () => account.begin());
  app.post("/api/account/disconnect", async () => {
    await account.disconnect();
    return account.status();
  });
  app.post("/api/account/refresh", async () => {
    await account.updateProfile();
    return account.status();
  });
  app.get("/api/account/callback", async (request, reply) => {
    reply.header("Cache-Control", "no-store").header("Referrer-Policy", "no-referrer");
    try {
      await account.callback(
        z
          .object({
            state: z.string().max(128).optional(),
            code: z.string().max(4096).optional(),
            error: z.string().max(200).optional(),
          })
          .parse(request.query),
      );
      broadcast("account-changed", true);
      return reply
        .type("text/html")
        .send(
          '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>osu!mosis</title><h1>Compte osu! connecté / osu! account connected</h1><p>Tu peux fermer cet onglet et revenir dans osu!mosis.<br>You can close this tab and return to osu!mosis.</p></html>',
        );
    } catch {
      broadcast("account-changed", false);
      return reply
        .code(400)
        .type("text/html")
        .send(
          '<!doctype html><html lang="fr"><meta charset="utf-8"><title>osu!mosis</title><h1>Connexion refusée ou expirée / Connection denied or expired</h1><p>Reviens dans osu!mosis pour relancer la connexion.<br>Return to osu!mosis to connect again.</p></html>',
        );
    }
  });
}
