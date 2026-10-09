export interface PlayRow {
  id: number;
  checksum: string;
  started_at: string;
  ended_at: string;
  outcome: string;
  mods: string;
  client: string;
  accuracy: number;
  combo: number;
  misses: number;
  slider_breaks: number;
  pp: number;
  ur: number;
  duration: number;
  events: string;
  map_info: string;
}
