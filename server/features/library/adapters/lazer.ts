import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readdir, readFile, realpath, rm, stat } from "node:fs/promises";
import path from "node:path";
import type RealmType from "realm";
import { parseOsu, type ParsedMap } from "./osu-file";
import { within } from "../../../infrastructure/paths";

type NamedFile = { Filename: string; File: { Hash: string } };
export interface LazerBeatmap {
  Hash: string;
  MD5Hash: string;
  StarRating: number;
  Status: number;
  OnlineID: number;
  BeatmapSet: {
    ID: unknown;
    OnlineID: number;
    DeletePending: boolean;
    Files: Iterable<NamedFile>;
  } | null;
}
export interface LazerMap {
  checksum: string;
  parsed: ParsedMap;
  file: string;
  root: string;
  audioName: string | null;
  backgroundName: string | null;
  setKey: string;
  stars: number | null;
  status: string;
  size: number;
  mtime: number;
}

export async function findLazerDatabase(root: string) {
  const files = (await readdir(root, { withFileTypes: true })).filter(
    (entry) => entry.isFile() && /^client(?:_\d+)?\.realm$/.test(entry.name),
  );
  const candidates = await Promise.all(
    files.map(async (entry) => ({
      file: path.join(root, entry.name),
      time: (await stat(path.join(root, entry.name))).mtimeMs,
    })),
  );
  candidates.sort((a, b) => b.time - a.time || a.file.localeCompare(b.file));
  if (!candidates.length)
    throw new Error(
      "Base lazer introuvable : choisir le dossier de données contenant client.realm (ou client_<version>.realm) et files.",
    );
  return candidates[0].file;
}

/** Open only our snapshot. Realm sidecars and migrations must never touch the game's database. */
export async function openLazerLibrary(folder: string, cacheDir: string) {
  const root = await realpath(folder);
  const filesRoot = await realpath(path.join(root, "files"));
  if (!within(root, filesRoot) || !(await stat(filesRoot)).isDirectory())
    throw new Error("Stockage files lazer hors du dossier de données ou invalide.");
  const source = await findLazerDatabase(root);
  await mkdir(cacheDir, { recursive: true });
  const temporary = await mkdtemp(path.join(cacheDir, "lazer-"));
  let realm: RealmType | undefined;
  let Realm: typeof RealmType | undefined;
  try {
    const before = await stat(source),
      snapshot = path.join(temporary, "library.realm");
    await copyFile(source, snapshot);
    const after = await stat(source);
    if (
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    )
      throw new Error(
        "La base lazer a changé pendant sa copie. Fermer lazer puis relancer l’indexation.",
      );
    try {
      Realm = (await import("realm")).default;
    } catch {
      throw new Error(
        "Module natif Realm indisponible. Autoriser static.realm.io pour l’installation, puis lancer npm rebuild realm.",
      );
    }
    realm = new Realm({ path: snapshot, readOnly: true });
    // osu! maps the C# RealmFile class to the persisted table name "File".
    const required = {
      Beatmap: ["Hash", "MD5Hash", "BeatmapSet", "StarRating", "Status"],
      BeatmapSet: ["Files", "DeletePending"],
      RealmNamedFileUsage: ["Filename", "File"],
      File: ["Hash"],
      BeatmapCollection: ["Name", "BeatmapMD5Hashes"],
    };
    for (const [name, properties] of Object.entries(required)) {
      const schema = realm.schema.find((item) => item.name === name);
      if (!schema || properties.some((property) => !(property in schema.properties)))
        throw new Error(
          `Schéma lazer ${realm.schemaVersion} non pris en charge : ${name}. Aucun fichier du jeu n’a été modifié`,
        );
    }
    return {
      file: source,
      version: realm.schemaVersion,
      filesRoot,
      maps: realm.objects("Beatmap") as unknown as Iterable<LazerBeatmap>,
      collections: () =>
        Array.from(
          realm!.objects("BeatmapCollection") as unknown as Iterable<{
            Name: string;
            BeatmapMD5Hashes: Iterable<string>;
          }>,
          (collection) => ({ name: collection.Name, hashes: [...collection.BeatmapMD5Hashes] }),
        ),
      close: async () => {
        realm!.close();
        Realm!.shutdown();
        await rm(temporary, { recursive: true, force: true });
      },
    };
  } catch (error) {
    realm?.close();
    Realm?.shutdown();
    await rm(temporary, { recursive: true, force: true });
    throw new Error(`Lecture lazer impossible : ${(error as Error).message}`, { cause: error });
  }
}

async function storedFile(root: string, hash: string) {
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error("Hash de fichier lazer invalide.");
  const normalized = hash.toLowerCase();
  const actual = await realpath(path.join(root, normalized[0], normalized.slice(0, 2), normalized));
  if (!within(root, actual) || !(await stat(actual)).isFile())
    throw new Error("Fichier lazer hors du stockage autorisé.");
  return actual;
}

/** Resolve logical filenames through the set, never by scanning the shared hash store. */
export async function readLazerMap(map: LazerBeatmap, filesRoot: string): Promise<LazerMap> {
  const set = map.BeatmapSet;
  if (!set) throw new Error("Difficulté lazer sans set.");
  // Compare canonical paths on both sides, including Windows short names and root aliases.
  const root = await realpath(filesRoot);
  const file = await storedFile(root, map.Hash),
    info = await stat(file);
  if (info.size > 16 * 1024 * 1024) throw new Error("Fichier .osu trop volumineux.");
  const bytes = await readFile(file);
  if (createHash("sha256").update(bytes).digest("hex") !== map.Hash.toLowerCase())
    throw new Error("Le contenu du fichier lazer ne correspond pas à son hash.");
  const checksum = createHash("md5").update(bytes).digest("hex");
  if (checksum !== map.MD5Hash.toLowerCase()) throw new Error("Checksum MD5 lazer incohérent.");
  const virtualFolder = path.join(root, "__logical_set__");
  const parsed = parseOsu(bytes.toString("utf8"), virtualFolder);
  const normalizeName = (name: string) => path.posix.normalize(name.replaceAll("\\", "/"));
  const names = new Map(
    Array.from(set.Files, (usage) => [normalizeName(usage.Filename), usage.File.Hash]),
  );
  const media = async (logical: string | null) => {
    if (!logical) return { file: null, name: null };
    const name = normalizeName(path.relative(virtualFolder, logical));
    const hash = names.get(name);
    if (!hash) return { file: null, name: null };
    try {
      return { file: await storedFile(root, hash), name };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { file: null, name: null };
      throw error;
    }
  };
  const [audio, background] = await Promise.all([media(parsed.audio), media(parsed.background)]);
  const statuses: Record<number, string> = {
    [-2]: "graveyard",
    [-1]: "wip",
    0: "pending",
    1: "ranked",
    2: "approved",
    3: "qualified",
    4: "loved",
  };
  return {
    checksum,
    parsed: {
      ...parsed,
      beatmapId: map.OnlineID > 0 ? map.OnlineID : parsed.beatmapId,
      setId: set.OnlineID > 0 ? set.OnlineID : parsed.setId,
      audio: audio.file,
      background: background.file,
    },
    file,
    root,
    audioName: audio.name,
    backgroundName: background.name,
    setKey: set.OnlineID > 0 ? `set:${set.OnlineID}` : `lazer:${String(set.ID)}`,
    stars: Number.isFinite(map.StarRating) && map.StarRating >= 0 ? map.StarRating : null,
    status: statuses[map.Status] ?? (map.OnlineID <= 0 ? "unsubmitted" : "unknown"),
    size: info.size,
    mtime: info.mtimeMs,
  };
}
