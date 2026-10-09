import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocketServer, type WebSocket } from "ws";
import type { TosuPayload } from "../server/features/telemetry/model";
import { normalizeTosuSnapshot } from "../server/features/telemetry/normalizer";
import { Tosu } from "../server/features/telemetry/service";
import type { Play } from "../shared/types";

const packet: TosuPayload = {
  client: "lazer",
  game: { paused: false },
  state: { number: 2, name: "play" },
  beatmap: {
    checksum: "a".repeat(32),
    title: "Fixture",
    time: { live: 0, firstObject: 1000, lastObject: 20000 },
    stats: { stars: { total: 5.5 } },
  },
  play: {
    score: 0,
    accuracy: 100,
    combo: { current: 0, max: 0 },
    hits: { "300": 0, "0": 0 },
    pp: { current: 0, fc: 120 },
    mods: { name: "NM" },
  },
  performance: { accuracy: { 99: 120, 100: 130 } },
};

test("normalization prefers a complete result score over stale live values", () => {
  const raw = {
    ...packet,
    state: { number: 7, name: "resultScreen" },
    resultsScreen: {
      score: 5000,
      accuracy: 99.2,
      maxCombo: 12,
      hits: { "0": 1 },
      pp: { current: 110, fc: 120 },
      rank: "A",
    },
  };
  const { next, completed, resultReady } = normalizeTosuSnapshot(raw, 2, Date.now(), "play");
  assert.equal(completed, true);
  assert.equal(resultReady, true);
  assert.equal(next.play?.pp, 110);
  assert.equal(next.play?.misses, 1);
  assert.equal(next.play?.rank, "A");
  assert.equal(next.ppScenarios?.length, 2);
});

test(
  "separated tosu transport records one completed attempt and excludes replays",
  { timeout: 10000 },
  async () => {
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(server, "listening");
    const sockets = new Map<string, WebSocket>();
    const stored: Omit<Play, "id">[] = [];
    const tosu = new Tosu({
      savePlay: async (play) => {
        stored.push(play);
        return stored.length;
      },
    });
    const getMode = () => tosu.capture.mode;
    const streamsReady = new Promise<void>((resolve) => {
      server.on("connection", (socket, request) => {
        sockets.set(request.url!, socket);
        if (request.url === "/tokens")
          socket.on("message", () => socket.send(JSON.stringify({ status: 2 })));
        if (sockets.size === 2) resolve();
      });
    });
    tosu.connect(`ws://127.0.0.1:${(server.address() as AddressInfo).port}/websocket/v2`);
    try {
      await streamsReady;
      const send = async (raw: TosuPayload) => {
        const live = once(tosu, "live", { signal: AbortSignal.timeout(2000) });
        sockets.get("/websocket/v2")!.send(JSON.stringify(raw));
        await live;
      };
      for (let i = 0; i < 10 && getMode() !== "play"; i++) {
        await send(packet);
        await delay(20);
      }
      assert.equal(getMode(), "play");
      await delay(400);
      await send(packet);
      assert.equal(tosu.capture.active, true);
      const active = {
        ...packet,
        beatmap: { ...packet.beatmap, time: { ...packet.beatmap.time, live: 5000 } },
        play: {
          ...packet.play,
          score: 5000,
          combo: { current: 12, max: 12 },
          hits: { "300": 12, "0": 0 },
          pp: { current: 110, fc: 120 },
        },
      };
      await send(active);
      const saved = once(tosu, "saved", { signal: AbortSignal.timeout(3000) });
      await send({
        ...active,
        state: { number: 7, name: "resultScreen" },
        resultsScreen: {
          score: 5000,
          accuracy: 100,
          maxCombo: 12,
          hits: { "300": 12, "0": 0 },
          pp: { current: 110, fc: 120 },
        },
      });
      await saved;
      assert.equal(stored.length, 1);
      assert.equal(stored[0].outcome, "completed");
      assert.equal(stored[0].pp, 110);
      assert.equal(stored[0].snapshot?.map.checksum, packet.beatmap.checksum);
      sockets.get("/tokens")!.send(JSON.stringify({ status: 8 }));
      for (let i = 0; i < 10 && getMode() !== "replay"; i++) {
        await send(packet);
        await delay(20);
      }
      assert.equal(getMode(), "replay");
      await delay(400);
      await send(active);
      assert.equal(tosu.capture.active, false);
      assert.equal(stored.length, 1);
    } finally {
      await tosu.stop();
      for (const socket of sockets.values()) socket.terminate();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);
