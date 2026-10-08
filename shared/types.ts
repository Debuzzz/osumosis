export type Source = "local" | "cached" | "new" | "all";
export type OsuClient = "stable" | "lazer";
export interface LibrarySelection {
  client: OsuClient;
  osuPath: string;
  songsPath: string;
}
export interface DetectedLibraries {
  stable: string[];
  lazer: string[];
}
export interface AccountProfile {
  id: number;
  username: string;
  avatarUrl: string | null;
  countryCode: string;
  playmode: string;
  pp: number | null;
  globalRank: number | null;
}
export interface AccountStatus {
  configured: boolean;
  connected: boolean;
  pending: boolean;
  profile: AccountProfile | null;
  updatedAt: string | null;
  redirectUri: string;
  error: string | null;
}
export interface Beatmap {
  key: string;
  beatmapId: number | null;
  setId: number | null;
  checksum: string;
  title: string;
  artist: string;
  creator: string;
  version: string;
  mode: number;
  status: string;
  stars: number | null;
  bpm: number | null;
  length: number;
  ar: number;
  od: number;
  cs: number;
  hp: number;
  objects: number;
  local: boolean;
  hasBackground: boolean;
  cover: string | null;
  played: boolean;
  lastPlayed: string | null;
  playCount: number;
  collections: string[];
  tags: string;
  source?: string;
  pp?: number;
  reason?: string;
}
export interface SearchResult {
  maps: Beatmap[];
  total: number;
  page: number;
  pages: number;
  groups?: Beatmap[][];
  totalSets?: number;
}
export interface Collection {
  id: number;
  name: string;
  total: number;
  installed: number;
}
export interface Settings {
  client: OsuClient;
  libraries: { stable: { osuPath: string; songsPath: string }; lazer: { osuPath: string } };
  tosuUrl: string;
  port: number;
  clientId: string;
  clientSecret: string;
  targetStars: number;
  preferredMods: string;
}
export interface PublicSettings extends Omit<Settings, "clientSecret"> {
  hasClientSecret: boolean;
}
export interface SettingsResponse {
  settings: PublicSettings;
  detectedPaths: DetectedLibraries;
}
export interface Job {
  running: boolean;
  phase: string;
  processed: number;
  total: number;
  errors: number;
  message: string;
  finishedAt?: string;
}
export interface Status {
  maps: number;
  installed: number;
  sets: number;
  collections: number;
  plays: number;
  modes: number[];
  tosu: {
    connected: boolean;
    lastSeen: string | null;
    error: string | null;
    capture?: CaptureStatus;
  };
  api: {
    configured: boolean;
    requests: number;
    remaining: number;
    cacheHits: number;
    nextAvailable: string | null;
  };
  index: Job;
}
export interface LiveState {
  connected: boolean;
  state: string;
  client: string;
  paused: boolean;
  map: {
    checksum: string;
    id: number;
    title: string;
    artist: string;
    version: string;
    time: number;
    duration: number;
    stars: number;
    firstObject?: number;
    mapper?: string;
    bpm?: number;
    ar?: number;
    cs?: number;
    od?: number;
    hp?: number;
    maxCombo?: number;
  } | null;
  play: {
    accuracy: number;
    combo: number;
    maxCombo: number;
    misses: number;
    sliderBreaks: number;
    pp: number;
    fcPp: number;
    ur: number;
    health: number;
    mods: string;
    hits: Record<string, number>;
    score?: number;
    rank?: string;
    maxPp?: number;
  } | null;
  capture?: CaptureStatus;
  history?: { time: number; pp: number; fcPp: number; accuracy: number }[];
  ppScenarios?: { accuracy: number; pp: number }[];
  events?: PlayEvent[];
}
export interface CaptureStatus {
  mode: "play" | "replay" | "unknown" | "idle";
  active: boolean;
  partial: boolean;
  messages: number;
  saved: number;
  lastSavedAt: string | null;
  error: string | null;
  statusConnected: boolean;
  reason: string;
}
export interface TosuDiagnostic {
  time: string;
  level: "info" | "warn" | "error";
  event: string;
  message: string;
}
export interface PlayEvent {
  time: number;
  kind: string;
  count: number;
  accuracy: number;
  combo: number;
  pp: number;
  fcPp?: number;
  intervalStart: number;
  confidence: "observed-interval";
}
export interface PlaySnapshot {
  map: NonNullable<LiveState["map"]>;
  play: NonNullable<LiveState["play"]>;
  ppScenarios?: LiveState["ppScenarios"];
}
export interface Play {
  id: number;
  checksum: string;
  title: string;
  artist: string;
  version: string;
  startedAt: string;
  endedAt: string;
  outcome: string;
  mods: string;
  client: string;
  accuracy: number;
  combo: number;
  misses: number;
  sliderBreaks: number;
  pp: number;
  ur: number;
  duration: number;
  events: PlayEvent[];
  partial?: boolean;
  sourceConfirmed?: boolean;
  snapshot?: PlaySnapshot;
}
export interface Analysis {
  checksum: string;
  mods: string;
  client: OsuClient;
  engine: string;
  stars: number;
  maxCombo: number;
  pp: { accuracy: number; pp: number }[];
  strains: { time: number; aim?: number; speed?: number; strain?: number }[];
}
