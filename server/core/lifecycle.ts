import type { FastifyInstance } from "fastify";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppServices } from "./services";
export function registerLifecycle(
  app: FastifyInstance,
  services: Pick<
    AppServices,
    "tosu" | "telemetryLog" | "watcher" | "realtime" | "catalog" | "dataDir"
  >,
) {
  app.addHook("onClose", async () => {
    const { tosu, telemetryLog, watcher, realtime, catalog, dataDir } = services;
    await tosu.stop();
    await telemetryLog.close();
    watcher.close();
    realtime.close();
    await catalog.close();
    try {
      const service = JSON.parse(await readFile(path.join(dataDir, "service.json"), "utf8"));
      if (service.pid === process.pid)
        await rm(path.join(dataDir, "service.json"), { force: true });
    } catch {
      /* No marker owned by this process. */
    }
  });
}
export async function startService(app: FastifyInstance, services: AppServices) {
  const { port, dataDir, settingsService, tosu, watcher } = services;
  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => {
      if (!stopping) {
        stopping = true;
        void app.close();
      }
    });
  try {
    await app.listen({ host: "127.0.0.1", port });
    await writeFile(
      path.join(dataDir, "service.json"),
      JSON.stringify({
        port,
        pid: process.pid,
        instance: process.env.OSUMOSIS_DESKTOP_INSTANCE || null,
        startedAt: new Date().toISOString(),
      }),
    );
    tosu.connect(settingsService.current.tosuUrl);
    watcher.setup();
    console.log(
      `\n  osu!mosis  ·  your next good play\n  http://127.0.0.1:${port}\n  Données : ${dataDir}\n  tosu : ${settingsService.current.tosuUrl}\n`,
    );
  } catch (error) {
    await app.close();
    throw error;
  }
}
