import type { z } from "zod";
import type { Settings } from "../../../shared/types";
import type { OsuAccount } from "../account/service";
import type { Catalog } from "../catalog/service";
import type { OsuApi } from "../discovery/service";
import type { Tosu } from "../telemetry/service";
import { selectedLibrary, settingsUpdateSchema } from "./model";
import { publicSettings, saveSettings } from "./repository";
type Dependencies = {
  catalog: Catalog;
  account: OsuAccount;
  tosu: Tosu;
  osu: OsuApi;
  watcher: { setup(): void };
};
export class SettingsService {
  saving = false;
  constructor(
    public current: Settings,
    private dependencies: Dependencies,
  ) {}
  async save(input: z.infer<typeof settingsUpdateSchema>) {
    if (this.saving) throw new Error("Une sauvegarde des réglages est déjà en cours.");
    const { catalog, account, tosu, osu, watcher } = this.dependencies;
    const next = {
      ...this.current,
      ...input,
      clientSecret:
        input.clientSecret === undefined || input.clientSecret === ""
          ? this.current.clientSecret
          : input.clientSecret,
    };
    this.saving = true;
    try {
      await catalog.call("selectLibrary", selectedLibrary(next));
      try {
        await saveSettings(next);
      } catch (error) {
        await catalog.call("selectLibrary", selectedLibrary(this.current));
        throw error;
      }
      if (
        next.clientId !== this.current.clientId ||
        next.clientSecret !== this.current.clientSecret
      )
        await account.disconnect();
      this.current = next;
      osu.reset();
      tosu.connect(next.tosuUrl);
      watcher.setup();
      return publicSettings(next);
    } finally {
      this.saving = false;
    }
  }
}
