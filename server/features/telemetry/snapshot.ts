import type { Attempt } from "./model";
export function prepareStoredAttempt(a: Attempt) {
  // Preserve the exact counters and final telemetry without changing earlier captures.
  if (a.snapshot) {
    a.snapshot.map.time = a.duration;
    Object.assign(a.snapshot.play, {
      accuracy: a.accuracy,
      maxCombo: a.combo,
      misses: a.misses,
      sliderBreaks: a.sliderBreaks,
      pp: a.pp,
      ur: a.ur,
      mods: a.mods,
    });
  }
  if (a.events.length < 12000)
    a.events.push({
      time: a.duration,
      kind: "sample",
      count: 0,
      accuracy: a.accuracy,
      combo: a.combo,
      pp: a.pp,
      fcPp: a.snapshot?.play.fcPp,
      intervalStart: a.lastTime,
      confidence: "observed-interval",
    });
  const { lastTime, lastSample, lastScore, lastJudgments, observedGameplay, ...play } = a;

  return play;
}
