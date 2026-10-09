import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { Job } from "../shared/types";
import { beatmap, md5 } from "./fixtures";

test("feature routes use current settings and preserve indexed maps and media", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "osumosis-api-"));
  process.env.OSUMOSIS_DATA = path.join(root, "data");
  const { createApp } = await import("../server/app");
  const { app, services } = await createApp();
  let reconnects = 0;
  services.tosu.connect = () => {
    reconnects++;
  };
  const headers = { host: "127.0.0.1", "x-osumosis": "1" };
  try {
    const response = await app.inject({ url: "/api/settings", headers });
    const initial = response.json().settings;
    assert.equal(initial.client, "lazer");
    const songs = path.join(root, "stable", "Songs");
    await mkdir(path.join(songs, "media"), { recursive: true });
    await writeFile(path.join(songs, "map.osu"), beatmap);
    await writeFile(path.join(songs, "media", "song.ogg"), "0123456789");
    const updated = {
      ...initial,
      client: "stable",
      targetStars: 6.1,
      libraries: {
        ...initial.libraries,
        stable: { osuPath: path.join(root, "stable"), songsPath: "" },
      },
    };
    const saved = await app.inject({
      method: "PUT",
      url: "/api/settings",
      headers,
      payload: updated,
    });
    assert.equal(saved.statusCode, 200);
    assert.equal(reconnects, 1);
    const latest = (await app.inject({ url: "/api/settings", headers })).json().settings;
    assert.equal(latest.client, "stable");
    assert.equal(latest.targetStars, 6.1);
    const indexed = new Promise<void>((resolve, reject) => {
      const done = (job: Job) => {
        if (!["done", "error"].includes(job.phase)) return;
        services.catalog.off("index", done);
        if (job.phase === "error") reject(new Error(job.message));
        else resolve();
      };
      services.catalog.on("index", done);
    });
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/index", headers, payload: {} })).statusCode,
      200,
    );
    await indexed;
    const maps = (await app.inject({ url: "/api/maps?group=sets&source=local", headers })).json();
    assert.equal(maps.total, 1);
    assert.equal(maps.groups[0][0].checksum, md5(beatmap));
    const detail = await app.inject({ url: "/api/maps/" + md5(beatmap), headers });
    assert.equal(detail.json().map.local, true);
    const media = await app.inject({
      url: `/api/assets/${md5(beatmap)}/audio`,
      headers: { ...headers, range: "bytes=2-5" },
    });
    assert.equal(media.statusCode, 206);
    assert.equal(media.body, "2345");
    const recommendations = (
      await app.inject({ method: "POST", url: "/api/recommend", headers, payload: {} })
    ).json();
    assert.equal(recommendations.target, 6.1);
    assert.ok(recommendations.maps.length <= 5);
    assert.equal((await app.inject({ url: "/api/plays", headers })).statusCode, 200);
    assert.equal((await app.inject({ url: "/api/account", headers })).json().connected, false);
    assert.equal((await app.inject({ url: "/api/status", headers })).json().installed, 1);
    assert.equal(
      (await app.inject({ url: "/api/status", headers: { host: "example.com" } })).statusCode,
      403,
    );
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/index", headers: { host: "127.0.0.1" } }))
        .statusCode,
      403,
    );
  } finally {
    await app.close();
    await rm(root, { recursive: true, force: true });
  }
});
