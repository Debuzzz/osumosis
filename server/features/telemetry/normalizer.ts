import type { CaptureStatus, LiveState } from "../../../shared/types";
import { n, resultState, text, type TosuPayload } from "./model";
export function normalizeTosuSnapshot(
  raw: TosuPayload,
  statusNumber: number | null,
  statusSeen: number,
  lastMode: CaptureStatus["mode"],
) {
  const b = raw.beatmap,
    p = raw.play || {},
    state = text(raw.state?.name) || String(raw.state?.number ?? "");
  const playing = Number(raw.state?.number) === 2 || /^(playing|play)$/i.test(state);
  const completed = resultState(raw.state?.number, state);
  const statusFresh = Date.now() - statusSeen < 3000;
  const replay =
    /replay|spectat|watch/i.test(state) ||
    raw.game?.isReplay === true ||
    (statusFresh && statusNumber === 8);
  const mode: CaptureStatus["mode"] = playing
    ? replay
      ? "replay"
      : statusFresh && statusNumber === 2
        ? "play"
        : "unknown"
    : completed
      ? lastMode
      : "idle";
  const result = completed ? raw.resultsScreen : null;
  const resultReady =
    !!result &&
    (n(result.score) > 0 ||
      Object.entries(result.hits || {}).some(
        ([key, value]) => ["0", "50", "100", "300", "geki", "katu"].includes(key) && n(value) > 0,
      ));
  const hits = Object.fromEntries(
    Object.entries((resultReady ? result!.hits : p.hits) || {}).map(([key, value]) => [
      key,
      n(value),
    ]),
  );
  const mods = text((resultReady ? result.mods : p.mods)?.name) || "NM";
  const stats = b.stats || {};
  const current = resultReady ? result! : p;
  const next: LiveState = {
    connected: true,
    state,
    client: text(raw.client) || "stable",
    paused: playing && !!raw.game?.paused,
    map: b.checksum
      ? {
          checksum: text(b.checksum).toLowerCase(),
          id: n(b.id),
          title: text(b.title),
          artist: text(b.artist),
          version: text(b.version),
          time: n(b.time?.live),
          firstObject: n(b.time?.firstObject),
          duration: n(b.time?.lastObject),
          stars: n(stats.stars?.total),
          mapper: text(b.mapper),
          bpm: n(stats.bpm?.realtime) || n(stats.bpm?.common),
          ar: n(stats.ar?.converted),
          cs: n(stats.cs?.converted),
          od: n(stats.od?.converted),
          hp: n(stats.hp?.converted),
          maxCombo: n(stats.maxCombo),
        }
      : null,
    play: {
      accuracy: n(current.accuracy),
      combo: resultReady ? n(result!.maxCombo) : n(p.combo?.current),
      maxCombo: resultReady ? n(result.maxCombo) : n(p.combo?.max),
      misses: n(hits["0"]),
      sliderBreaks: n(p.hits?.sliderBreaks),
      pp: n(current.pp?.current),
      fcPp: n(current.pp?.fc),
      ur: n(p.unstableRate),
      health: n(p.healthBar?.normal),
      mods,
      hits,
      score: n(current.score),
      rank: text(resultReady ? result!.rank : p.rank?.current),
      maxPp: n(p.pp?.maxAchievable),
    },
    ppScenarios: [95, 97, 98, 99, 100]
      .filter((accuracy) => Number.isFinite(raw.performance?.accuracy?.[accuracy]))
      .map((accuracy) => ({ accuracy, pp: n(raw.performance!.accuracy![accuracy]) })),
  };
  return { next, playing, completed, replay, mode, result, resultReady, p, mods, state };
}
