import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  findLazerDatabase,
  readLazerMap,
  type LazerBeatmap,
} from "../server/features/library/adapters/lazer";
import { beatmap, md5, storeLazerFile } from "./fixtures";

test("lazer resolves maps and media through hashed files and named set references", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "osumosis-lazer-files-")));
  try {
    const [map, audio, background] = await Promise.all([
      storeLazerFile(root, beatmap),
      storeLazerFile(root, "audio fixture"),
      storeLazerFile(root, "image fixture"),
    ]);
    const entry: LazerBeatmap = {
      Hash: map.hash,
      MD5Hash: md5(beatmap),
      OnlineID: 123,
      StarRating: 4.5,
      Status: 1,
      BeatmapSet: {
        ID: "set-id",
        OnlineID: 456,
        DeletePending: false,
        Files: [
          { Filename: "map.osu", File: { Hash: map.hash } },
          { Filename: "media/song.ogg", File: { Hash: audio.hash } },
          { Filename: "background.jpg", File: { Hash: background.hash } },
        ],
      },
    };
    const result = await readLazerMap(entry, root);
    assert.equal(result.checksum, entry.MD5Hash);
    assert.equal(result.file, map.file);
    assert.equal(result.parsed.audio, audio.file);
    assert.equal(result.parsed.background, background.file);
    assert.equal(result.audioName, "media/song.ogg");
    assert.equal(result.backgroundName, "background.jpg");
    assert.equal(result.status, "ranked");
    assert.equal(result.stars, 4.5);
    assert.notEqual(path.dirname(map.file), path.dirname(audio.file));
    await writeFile(map.file, beatmap + "corruption");
    await assert.rejects(readLazerMap(entry, root), /ne correspond pas à son hash/);
    await writeFile(map.file, beatmap);
    await assert.rejects(readLazerMap({ ...entry, MD5Hash: "0".repeat(32) }, root), /MD5/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("lazer accepts a storage root alias and returns canonical map and media paths", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "osumosis-lazer-alias-")));
  try {
    const files = path.join(root, "files"),
      alias = path.join(root, "alias");
    const [map, audio] = await Promise.all([
      storeLazerFile(files, beatmap),
      storeLazerFile(files, "audio fixture"),
    ]);
    await symlink(files, alias, process.platform === "win32" ? "junction" : "dir");
    const entry: LazerBeatmap = {
      Hash: map.hash,
      MD5Hash: md5(beatmap),
      OnlineID: 123,
      StarRating: 4.5,
      Status: 1,
      BeatmapSet: {
        ID: "set-id",
        OnlineID: 456,
        DeletePending: false,
        Files: [{ Filename: "media/song.ogg", File: { Hash: audio.hash } }],
      },
    };
    const result = await readLazerMap(entry, alias);
    assert.equal(result.root, await realpath(files));
    assert.equal(result.file, await realpath(map.file));
    assert.equal(result.parsed.audio, await realpath(audio.file));
    assert.equal(result.audioName, "media/song.ogg");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("symlinks cannot expose a map outside the lazer storage", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "osumosis-lazer-boundary-")));
  try {
    const files = path.join(root, "files");
    await mkdir(files);
    const external = await storeLazerFile(path.join(root, "external"), beatmap);
    await symlink(
      path.join(root, "external", external.hash[0]),
      path.join(files, external.hash[0]),
      process.platform === "win32" ? "junction" : "dir",
    );
    const entry: LazerBeatmap = {
      Hash: external.hash,
      MD5Hash: md5(beatmap),
      OnlineID: 123,
      StarRating: 4,
      Status: 1,
      BeatmapSet: { ID: "id", OnlineID: 456, DeletePending: false, Files: [] },
    };
    await assert.rejects(readLazerMap(entry, files), /hors du stockage/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("database discovery selects the most recently updated client database, excluding backups", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "osumosis-lazer-discovery-"));
  try {
    await writeFile(path.join(root, "client.realm"), "old");
    await writeFile(path.join(root, "client_52.realm"), "current");
    await writeFile(path.join(root, "client.realm.backup"), "backup");
    await mkdir(path.join(root, "client_100.realm"));
    await utimes(path.join(root, "client.realm"), 100, 100);
    await utimes(path.join(root, "client_52.realm"), 200, 200);
    assert.equal(await findLazerDatabase(root), path.join(root, "client_52.realm"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
