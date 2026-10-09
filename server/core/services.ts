import path from "node:path";
import { OsuAccount } from "../features/account/service";
import { Analyzer } from "../features/analysis/service";
import { Catalog } from "../features/catalog/service";
import { OsuApi } from "../features/discovery/service";
import { createLibraryWatcher } from "../features/library/watcher";
import { Covers } from "../features/media/cover-cache";
import { selectedLibrary } from "../features/settings/model";
import { dataDir, loadSettings } from "../features/settings/repository";
import { SettingsService } from "../features/settings/service";
import { TelemetryLog } from "../features/telemetry/logger";
import { Tosu } from "../features/telemetry/service";
import { RealtimeHub } from "../http/realtime";

export async function createServices() {
  const initial = await loadSettings();
  const port = Number(process.env.OSUMOSIS_PORT || initial.port);
  const account = new OsuAccount(
    dataDir,
    () => settingsService.current,
    `http://127.0.0.1:${port}/api/account/callback`,
  );
  const catalog = new Catalog(dataDir);
  await catalog.ready;
  await catalog.call("selectLibrary", selectedLibrary(initial));
  const analyzer = new Analyzer(catalog);
  const tosu = new Tosu({ savePlay: (play) => catalog.call("savePlay", play) });
  const osu = new OsuApi(catalog, () => settingsService.current);
  const covers = new Covers(dataDir);
  const watcher = createLibraryWatcher(
    catalog,
    () => settingsService.current,
    () => settingsService.saving,
  );
  const settingsService: SettingsService = new SettingsService(initial, {
    catalog,
    account,
    tosu,
    osu,
    watcher,
  });
  await account.load();
  const telemetryLog = new TelemetryLog(path.join(dataDir, "tosu.log"));
  const realtime = new RealtimeHub();
  return {
    catalog,
    analyzer,
    tosu,
    osu,
    covers,
    account,
    settingsService,
    telemetryLog,
    realtime,
    watcher,
    port,
    dataDir,
    broadcast: realtime.broadcast,
  };
}
export type AppServices = Awaited<ReturnType<typeof createServices>>;
