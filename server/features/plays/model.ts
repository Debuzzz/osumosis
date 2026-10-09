import type { Play } from "../../../shared/types";
import type { PlayRow } from "./storage-model";
export function playRow(row: PlayRow): Play {
  const info = JSON.parse(row.map_info) as Pick<
    Play,
    "title" | "artist" | "version" | "partial" | "sourceConfirmed" | "snapshot"
  >;
  return {
    id: row.id,
    checksum: row.checksum,
    title: info.title || "Map inconnue",
    artist: info.artist || "",
    version: info.version || "",
    partial: !!info.partial,
    sourceConfirmed: info.sourceConfirmed,
    snapshot: info.snapshot,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    outcome: row.outcome,
    mods: row.mods,
    client: row.client,
    accuracy: row.accuracy,
    combo: row.combo,
    misses: row.misses,
    sliderBreaks: row.slider_breaks,
    pp: row.pp,
    ur: row.ur,
    duration: row.duration,
    events: JSON.parse(row.events),
  };
}
