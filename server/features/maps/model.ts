import type { Beatmap } from "../../../shared/types";
import type { CatalogContext } from "../../infrastructure/catalog-context";
import {
  legacyCollectionSource as legacyFor,
  collectionSource as sourceFor,
} from "../library/model";
export interface MapRow {
  checksum: string;
  beatmap_id: number | null;
  set_id: number | null;
  set_key: string;
  title: string;
  artist: string;
  creator: string;
  version: string;
  mode: number;
  status: string;
  stars: number | null;
  bpm: number | null;
  length: number;
  ar: number;
  od: number;
  cs: number;
  hp: number;
  objects: number;
  local: number;
  played: number;
  cover: string | null;
  last_played: string | null;
  play_count: number;
  tags: string;
  source: string;
  file_path: string | null;
  audio_path: string | null;
  background_path: string | null;
  asset_root: string | null;
  audio_name: string | null;
  background_name: string | null;
  preview: number;
  file_size: number | null;
  file_mtime: number | null;
}
export function createMapMapper(context: CatalogContext) {
  const db = context.db;
  const collectionSource = () => sourceFor(context.library);
  const legacyCollectionSource = () => legacyFor(context.library);
  const collectionNames = db.prepare(
    "SELECT c.name FROM collections c JOIN collection_members cm ON cm.collection_id=c.id WHERE cm.checksum=? AND (c.source=? OR c.source=?) ORDER BY c.name",
  );
  return function mapRow(row: MapRow): Beatmap {
    return {
      key: row.checksum,
      checksum: row.checksum,
      beatmapId: row.beatmap_id,
      setId: row.set_id,
      title: row.title,
      artist: row.artist,
      creator: row.creator,
      version: row.version,
      mode: row.mode,
      status: row.status,
      stars: row.stars,
      bpm: row.bpm,
      length: row.length,
      ar: row.ar,
      od: row.od,
      cs: row.cs,
      hp: row.hp,
      objects: row.objects,
      local: !!row.local,
      hasBackground: !!row.local && !!row.background_path,
      cover: row.cover,
      played: !!row.played,
      lastPlayed: row.last_played,
      playCount: row.play_count,
      tags: row.tags,
      source: row.source,
      collections: (
        collectionNames.all(row.checksum, collectionSource(), legacyCollectionSource()) as {
          name: string;
        }[]
      ).map((v) => v.name),
    };
  };
}
