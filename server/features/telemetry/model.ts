import type { LiveState, Play } from "../../../shared/types";
export const blank: LiveState = {
  connected: false,
  state: "Hors ligne",
  client: "",
  paused: false,
  map: null,
  play: null,
};
export const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
export const numberOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
export const text = (value: unknown) => (typeof value === "string" ? value : "");
export const resultState = (number: unknown, name: string) =>
  [7, 14, 17, 18].includes(Number(number)) || /result|ranking/i.test(name);
export type Attempt = Omit<Play, "id" | "endedAt" | "outcome"> & {
  lastTime: number;
  lastSample: number;
  lastScore: number;
  lastJudgments: number;
  observedGameplay: boolean;
};
export type StartCandidate = {
  checksum: string;
  since: number;
  lastTime: number;
  score: number;
  judgments: number;
};
export const judgmentCount = (hits: Record<string, number>) =>
  ["0", "50", "100", "300", "geki", "katu"].reduce((sum, key) => sum + n(hits[key]), 0);

export interface TosuScore {
  accuracy?: number;
  score?: number;
  maxCombo?: number;
  rank?: string;
  mods?: { name?: string };
  hits?: Record<string, number>;
  pp?: { current?: number; fc?: number };
}
export interface TosuPayload {
  client?: string;
  game?: { paused?: boolean; isReplay?: boolean };
  state: { number?: number; name?: string };
  beatmap: {
    checksum?: string;
    id?: number;
    title?: string;
    artist?: string;
    version?: string;
    mapper?: string;
    time?: { live?: number; firstObject?: number; lastObject?: number };
    stats?: {
      stars?: { total?: number };
      bpm?: { realtime?: number; common?: number };
      ar?: { converted?: number };
      cs?: { converted?: number };
      od?: { converted?: number };
      hp?: { converted?: number };
      maxCombo?: number;
    };
  };
  play?: Omit<TosuScore, "rank"> & {
    rank?: { current?: string };
    combo?: { current?: number; max?: number };
    unstableRate?: number;
    healthBar?: { normal?: number };
    failed?: boolean;
    pp?: TosuScore["pp"] & { maxAchievable?: number };
  };
  resultsScreen?: TosuScore;
  performance?: { accuracy?: Record<number, number> };
}
