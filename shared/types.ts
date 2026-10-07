export type Source = 'local' | 'cached' | 'new' | 'all';
export interface Beatmap {
  key: string; beatmapId: number | null; setId: number | null; checksum: string;
  title: string; artist: string; creator: string; version: string; mode: number;
  status: string; stars: number | null; bpm: number | null; length: number;
  ar: number; od: number; cs: number; hp: number; objects: number;
  local: boolean; hasBackground: boolean; cover: string | null;
  played: boolean; lastPlayed: string | null; playCount: number;
  collections: string[]; tags: string; pp?: number; reason?: string;
}
export interface SearchResult { maps: Beatmap[]; total: number; page: number; pages: number }
export interface Collection { id: number; name: string; total: number; installed: number }
export interface Settings {
  osuPath: string; songsPath: string; tosuUrl: string; port: number;
  clientId: string; clientSecret: string; targetStars: number; preferredMods: string;
}
export interface PublicSettings extends Omit<Settings, 'clientSecret'> { hasClientSecret: boolean }
export interface Job { running: boolean; phase: string; processed: number; total: number; errors: number; message: string; finishedAt?: string }
export interface Status {
  maps: number; installed: number; sets: number; collections: number; plays: number;
  modes: number[]; tosu: { connected: boolean; lastSeen: string | null; error: string | null };
  api: { configured: boolean; requests: number; remaining: number; cacheHits: number; nextAvailable: string | null };
  index: Job;
}
export interface LiveState {
  connected: boolean; state: string; client: string; paused: boolean;
  map: { checksum: string; id: number; title: string; artist: string; version: string; time: number; duration: number; stars: number } | null;
  play: { accuracy: number; combo: number; maxCombo: number; misses: number; sliderBreaks: number; pp: number; fcPp: number; ur: number; health: number; mods: string; hits: Record<string, number> } | null;
}
export interface PlayEvent { time: number; kind: string; count: number; accuracy: number; combo: number; pp: number; intervalStart: number; confidence: 'observed-interval' }
export interface Play {
  id: number; checksum: string; title: string; artist: string; version: string;
  startedAt: string; endedAt: string; outcome: string; mods: string; client: string;
  accuracy: number; combo: number; misses: number; sliderBreaks: number; pp: number;
  ur: number; duration: number; events: PlayEvent[];
}
export interface Analysis {
  checksum: string; mods: string; engine: string; stars: number; maxCombo: number;
  pp: { accuracy: number; pp: number }[];
  strains: { time: number; aim?: number; speed?: number; strain?: number }[];
}
