import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export class Reader {
  offset = 0;
  constructor(readonly data: Buffer) {}
  need(n: number) {
    if (n < 0 || this.offset + n > this.data.length)
      throw new Error("Base tronquée ou format non pris en charge.");
  }
  skip(n: number) {
    this.need(n);
    this.offset += n;
  }
  byte() {
    this.need(1);
    return this.data[this.offset++];
  }
  short() {
    this.need(2);
    const v = this.data.readUInt16LE(this.offset);
    this.offset += 2;
    return v;
  }
  int() {
    this.need(4);
    const v = this.data.readInt32LE(this.offset);
    this.offset += 4;
    return v;
  }
  long() {
    this.need(8);
    const v = this.data.readBigInt64LE(this.offset);
    this.offset += 8;
    return v;
  }
  float() {
    this.need(4);
    const v = this.data.readFloatLE(this.offset);
    this.offset += 4;
    return v;
  }
  double() {
    this.need(8);
    const v = this.data.readDoubleLE(this.offset);
    this.offset += 8;
    return v;
  }
  count(limit = 2_000_000) {
    const n = this.int();
    if (n < 0 || n > limit) throw new Error("Nombre d’entrées invalide.");
    return n;
  }
  string() {
    const marker = this.byte();
    if (marker === 0) return "";
    if (marker !== 0x0b) throw new Error("Marqueur de chaîne invalide.");
    let n = 0,
      shift = 0,
      b: number;
    do {
      b = this.byte();
      n += (b & 0x7f) * 2 ** shift;
      shift += 7;
      if (shift > 35) throw new Error("Chaîne trop longue.");
    } while (b & 0x80);
    if (n > 16_000_000) throw new Error("Chaîne trop longue.");
    this.need(n);
    const result = this.data.toString("utf8", this.offset, this.offset + n);
    this.offset += n;
    return result;
  }
}
export function ticksDate(ticks: bigint) {
  if (ticks <= 621355968000000000n) return null;
  const ms = Number((ticks - 621355968000000000n) / 10000n);
  return Number.isFinite(ms) && ms < 8.64e15 ? new Date(ms).toISOString() : null;
}
export async function snapshot(file: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await stat(file);
    if (before.size > 512 * 1024 * 1024) throw new Error("Base trop volumineuse (limite 512 Mio).");
    const bytes = await readFile(file);
    const after = await stat(file);
    if (
      before.size === after.size &&
      before.mtimeMs === after.mtimeMs &&
      bytes.length === after.size
    )
      return bytes;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Le jeu écrit encore dans la base. Réessayer dans quelques secondes.");
}
export interface StableEntry {
  checksum: string;
  stars: number | null;
  status: string;
  played: boolean;
  lastPlayed: string | null;
}
export async function readStableDatabase(file: string) {
  const r = new Reader(await snapshot(file));
  const version = r.int();
  if (version < 20080101 || version > 20991231)
    throw new Error(`Version osu!.db non prise en charge : ${version}`);
  r.int();
  r.byte();
  r.long();
  r.string();
  const count = r.count();
  const entries = new Map<string, StableEntry>();
  for (let i = 0; i < count; i++) {
    if (version < 20191106) r.int();
    for (let j = 0; j < 7; j++) r.string();
    const checksum = r.string();
    r.string();
    const rank = r.byte();
    r.skip(6);
    r.long();
    for (let j = 0; j < 4; j++) {
      if (version < 20140609) r.byte();
      else r.float();
    }
    r.double();
    const stars: (number | null)[] = [null, null, null, null];
    if (version >= 20140609) {
      for (let mode = 0; mode < 4; mode++) {
        const n = r.count(10000);
        for (let j = 0; j < n; j++) {
          if (r.byte() !== 0x08) throw new Error("Type de mods invalide dans osu!.db.");
          const mods = r.int();
          const expected = version >= 20250107 ? 0x0c : 0x0d;
          if (r.byte() !== expected) throw new Error("Type de star rating non pris en charge.");
          const sr = version >= 20250107 ? r.float() : r.double();
          if (mods === 0 && Number.isFinite(sr)) stars[mode] = sr;
        }
      }
    }
    r.skip(12);
    const timings = r.count(100000);
    r.skip(timings * 17);
    r.skip(12 + 4 + 2 + 4);
    const mode = r.byte();
    r.string();
    r.string();
    r.skip(2);
    r.string();
    const unplayed = !!r.byte();
    const lastPlayed = ticksDate(r.long());
    r.byte();
    r.string();
    r.long();
    r.skip(5);
    if (version < 20140609) r.short();
    r.int();
    r.byte();
    const statuses = [
      "unknown",
      "unsubmitted",
      "pending",
      "unknown",
      "ranked",
      "approved",
      "qualified",
      "loved",
    ];
    if (/^[a-f0-9]{32}$/i.test(checksum))
      entries.set(checksum, {
        checksum,
        stars: stars[mode] ?? null,
        status: statuses[rank] ?? "unknown",
        played: !unplayed,
        lastPlayed,
      });
  }
  return entries;
}
export async function readCollections(file: string) {
  const r = new Reader(await snapshot(file));
  r.int();
  const count = r.count(100000);
  const collections: { name: string; hashes: string[] }[] = [];
  for (let i = 0; i < count; i++) {
    const name = r.string();
    const n = r.count();
    const hashes: string[] = [];
    for (let j = 0; j < n; j++) hashes.push(r.string());
    collections.push({ name, hashes: [...new Set(hashes)] });
  }
  return collections;
}
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
export function within(root: string, target: string) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel === "" || (!rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel));
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
