import { readFile, stat } from "node:fs/promises";
import { Reader, ticksDate } from "./binary-reader";
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
