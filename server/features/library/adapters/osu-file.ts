import path from "node:path";
import { within } from "../../../infrastructure/paths";
export interface ParsedMap {
  beatmapId: number | null;
  setId: number | null;
  title: string;
  artist: string;
  creator: string;
  version: string;
  mode: number;
  bpm: number | null;
  length: number;
  ar: number;
  od: number;
  cs: number;
  hp: number;
  objects: number;
  tags: string;
  source: string;
  audio: string | null;
  background: string | null;
  preview: number;
}
export function parseOsu(text: string, folder: string): ParsedMap {
  let section = "";
  const values: Record<string, string> = {};
  const timings: number[] = [];
  let objects = 0,
    first = Infinity,
    last = 0;
  let background: string | null = null;
  for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.startsWith("[")) {
      section = line.slice(1, -1);
      continue;
    }
    if (section === "TimingPoints") {
      const fields = line.split(",");
      const beatLength = Number(fields[1]);
      if (beatLength > 0 && Number.isFinite(beatLength) && (fields.length < 7 || fields[6] === "1"))
        timings.push(60000 / beatLength);
    } else if (section === "HitObjects") {
      const f = line.split(",");
      const time = Number(f[2]);
      if (!Number.isFinite(time)) continue;
      objects++;
      first = Math.min(first, time);
      last = Math.max(last, time);
      if ((Number(f[3]) & (8 | 128)) !== 0)
        last = Math.max(last, Number(f[5]?.split(":")[0]) || time);
    } else if (section === "Events") {
      const match = line.match(/^(?:0|Background),\s*\d+,\s*"([^"]+)"/i);
      if (match) {
        const target = path.resolve(folder, match[1]);
        if (within(folder, target)) background = target;
      }
    } else {
      const at = line.indexOf(":");
      if (at >= 0) values[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
  }
  const numeric = (field: string, fallback = 0) =>
    Number.isFinite(Number(values[field])) ? Number(values[field]) : fallback;
  const id = (field: string) => (numeric(field) > 0 ? numeric(field) : null);
  timings.sort((a, b) => a - b);
  const audioPath = values.AudioFilename ? path.resolve(folder, values.AudioFilename) : null;
  return {
    beatmapId: id("BeatmapID"),
    setId: id("BeatmapSetID"),
    title: values.TitleUnicode || values.Title || "Sans titre",
    artist: values.ArtistUnicode || values.Artist || "Artiste inconnu",
    creator: values.Creator || "",
    version: values.Version || "",
    mode: numeric("Mode"),
    bpm: timings.length ? Math.round(timings[Math.floor(timings.length / 2)] * 100) / 100 : null,
    length: Number.isFinite(first) ? Math.max(0, Math.round((last - first) / 1000)) : 0,
    ar: numeric("ApproachRate", numeric("OverallDifficulty", 5)),
    od: numeric("OverallDifficulty", 5),
    cs: numeric("CircleSize", 5),
    hp: numeric("HPDrainRate", 5),
    objects,
    tags: values.Tags || "",
    source: values.Source || "",
    preview: numeric("PreviewTime", -1),
    background,
    audio: audioPath && within(folder, audioPath) ? audioPath : null,
  };
}
