import type { LibrarySelection } from "../../../shared/types";
export const libraryKey = (input: LibrarySelection) => JSON.stringify(input);
export const collectionSource = (library: LibrarySelection) =>
  library.client + ":" + (library.osuPath || library.songsPath);
export const legacyCollectionSource = (library: LibrarySelection) =>
  library.client === "stable" ? library.osuPath : "";
