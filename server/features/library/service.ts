import path from "node:path";
import type { LibrarySelection } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import { createLazerIndexer } from "./lazer-indexer";
import { libraryKey } from "./model";
import { createStableIndexer } from "./stable-indexer";
export function createLibraryService(context: CatalogContext) {
  const db = context.db;
  const indexStableLibrary = createStableIndexer(context);
  const indexLazerLibrary = createLazerIndexer(context);
  function selectLibrary(input: LibrarySelection) {
    const normalized = {
      client: input.client,
      osuPath: input.osuPath ? path.resolve(input.osuPath) : "",
      songsPath: input.client === "stable" && input.songsPath ? path.resolve(input.songsPath) : "",
    };
    const key = libraryKey(normalized);
    const old = db.prepare("SELECT value FROM catalog_state WHERE key=?").get("active_library") as
      { value: string } | undefined;
    if (old?.value !== key) {
      if (context.job.running)
        throw new Error("Attendre la fin de l’indexation avant de changer de bibliothèque.");
      db.transaction(() => {
        db.prepare("UPDATE maps SET local=0 WHERE local=1").run();
        db.prepare("INSERT OR REPLACE INTO catalog_state(key,value) VALUES(?,?)").run(
          "active_library",
          key,
        );
      })();
      context.job = {
        running: false,
        phase: "idle",
        processed: 0,
        total: 0,
        errors: 0,
        message: `Profil ${input.client} sélectionné. Indexer cette bibliothèque pour afficher les maps installées.`,
      };
      context.emitProgress();
    }
    context.library = normalized;
  }
  return {
    selectLibrary,
    index(input: LibrarySelection) {
      if (context.job.running) return context.job;
      selectLibrary(input);
      if (!context.library.osuPath && !context.library.songsPath)
        throw new Error(`Configurer le dossier de données osu!${input.client} dans les réglages.`);
      context.job = {
        running: true,
        phase: "prepare",
        processed: 0,
        total: 0,
        errors: 0,
        message: "Lecture de la bibliothèque…",
      };
      context.emitProgress();
      void (
        input.client === "lazer"
          ? indexLazerLibrary(context.library)
          : indexStableLibrary(context.library)
      ).catch((error) => {
        context.job = { ...context.job, running: false, phase: "error", message: error.message };
        context.emitProgress();
      });
      return context.job;
    },
  };
}
