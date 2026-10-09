import type { Beatmap } from "../../../shared/types";

export const modes = ["osu!", "taiko", "catch", "mania"];
export function coverUrl(map: Beatmap, allowFetch = false) {
  return map.hasBackground
    ? `/api/assets/${encodeURIComponent(map.key)}/background`
    : map.cover
      ? `/api/covers/${encodeURIComponent(map.key)}?fetch=${allowFetch ? "1" : "0"}`
      : null;
}
