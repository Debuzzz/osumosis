import type Database from "better-sqlite3";
import type { Job, LibrarySelection } from "../../shared/types";
export interface CatalogContext {
  db: Database.Database;
  dataDir: string;
  library: LibrarySelection;
  job: Job;
  emitProgress: () => void;
}
