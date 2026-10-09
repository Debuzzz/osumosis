export interface DiscoveryCache {
  query_key: string;
  cursor: string | null;
  fetched_at: string;
  total: number;
}
export interface RemoteBeatmap {
  checksum?: string;
  id: number;
  version?: string;
  mode_int?: number;
  status?: string;
  difficulty_rating?: number;
  bpm?: number;
  hit_length?: number;
  total_length?: number;
  ar?: number;
  accuracy?: number;
  cs?: number;
  drain?: number;
  count_circles?: number;
  count_sliders?: number;
  count_spinners?: number;
}
export interface RemoteSet {
  id: number;
  title_unicode?: string;
  title?: string;
  artist_unicode?: string;
  artist?: string;
  creator?: string;
  status?: string;
  bpm?: number;
  tags?: string;
  source?: string;
  covers?: { cover?: string };
  beatmaps?: RemoteBeatmap[];
}
export interface DiscoveryResponse {
  beatmapsets?: RemoteSet[];
  cursor_string?: string;
  total?: number;
}
export interface DiscoveryResult {
  imported: number;
  cached: boolean;
  total: number;
  hasMore: boolean;
}
export interface DiscoveryInput {
  q: string;
  mode: string;
  status: string;
  more: boolean;
}
