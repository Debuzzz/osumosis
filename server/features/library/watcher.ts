import { existsSync, watch, type FSWatcher } from "node:fs";
import path from "node:path";
import type { Settings } from "../../../shared/types";
import { Catalog } from "../catalog/service";
import { selectedLibrary } from "../settings/model";
export function createLibraryWatcher(
  catalog: Catalog,
  getSettings: () => Settings,
  isSaving: () => boolean,
) {
  let watchers: FSWatcher[] = [];
  let watchTimer: NodeJS.Timeout | undefined;
  function setup() {
    const settings = getSettings();
    for (const watcher of watchers) watcher.close();
    watchers = [];
    if (watchTimer) clearTimeout(watchTimer);
    const schedule = () => {
      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        if (!isSaving())
          void catalog
            .call("index", selectedLibrary(getSettings()))
            .catch((error) => console.warn(error.message));
      }, 2500);
      watchTimer.unref();
    };
    // Lazer is indexed manually from a closed-client snapshot; never continuously copy a live Realm.
    if (settings.client === "lazer") return;
    const library = selectedLibrary(settings);
    const songs = library.songsPath || (library.osuPath ? path.join(library.osuPath, "Songs") : "");
    try {
      if (songs && existsSync(songs)) {
        const watcher = watch(songs, { recursive: true }, (_, file) => {
          if (!file || /\.osu$/i.test(String(file))) schedule();
        });
        watcher.on("error", (error) => console.warn("Surveillance Songs :", error.message));
        watchers.push(watcher);
      }
      if (library.osuPath && existsSync(library.osuPath)) {
        const watcher = watch(library.osuPath, (_, file) => {
          if (file && /^(osu!|collection)\.db$/i.test(String(file))) schedule();
        });
        watcher.on("error", (error) => console.warn("Surveillance osu! :", error.message));
        watchers.push(watcher);
      }
    } catch (error) {
      console.warn("Surveillance indisponible :", (error as Error).message);
    }
  }
  return {
    setup,
    close() {
      for (const watcher of watchers) watcher.close();
      if (watchTimer) clearTimeout(watchTimer);
    },
  };
}
