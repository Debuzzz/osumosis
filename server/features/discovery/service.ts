import { createHash } from "node:crypto";
import type { Settings } from "../../../shared/types";
import { ApiError } from "../../core/api-error";
import type { Catalog } from "../catalog/service";
import type { DiscoveryResponse, DiscoveryResult } from "./model";

export class OsuApi {
  private token = "";
  private expires = 0;
  private lastRequest = 0;
  private requests: number[] = [];
  private blockedUntil = 0;
  cacheHits = 0;
  private inflight = new Map<string, Promise<DiscoveryResult>>();
  private busy = false;
  constructor(
    private catalog: Catalog,
    private settings: () => Settings,
  ) {}
  reset() {
    this.token = "";
    this.expires = 0;
  }
  status() {
    this.requests = this.requests.filter((time) => Date.now() - time < 60000);
    const next = Math.max(
      this.lastRequest + 12000,
      this.blockedUntil,
      this.requests.length >= 5 ? this.requests[0] + 60001 : 0,
    );
    return {
      configured: !!this.settings().clientId && !!this.settings().clientSecret,
      requests: this.requests.length,
      remaining: Math.max(0, 5 - this.requests.length),
      cacheHits: this.cacheHits,
      nextAvailable: next > Date.now() ? new Date(next).toISOString() : null,
    };
  }
  private reserve() {
    const status = this.status();
    if (status.nextAvailable)
      throw new ApiError(
        `Budget réseau : prochaine requête disponible à ${new Date(status.nextAvailable).toLocaleTimeString("fr-FR")}.`,
        429,
      );
    this.lastRequest = Date.now();
    this.requests.push(this.lastRequest);
  }
  private async accessToken() {
    if (this.token && Date.now() < this.expires) return this.token;
    const settings = this.settings();
    if (!settings.clientId || !settings.clientSecret)
      throw new ApiError("Configurer le Client ID et le secret osu! dans les réglages.");
    const response = await fetch("https://osu.ppy.sh/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: Number(settings.clientId),
        client_secret: settings.clientSecret,
        grant_type: "client_credentials",
        scope: "public",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new ApiError(`Authentification osu! refusée (${response.status}).`, 502);
    const data = (await response.json()) as { access_token: string; expires_in: number };
    if (!data.access_token) throw new ApiError("Réponse OAuth invalide.", 502);
    this.token = data.access_token;
    this.expires = Date.now() + Math.max(0, data.expires_in - 60) * 1000;
    return this.token;
  }
  async discover(input: {
    q: string;
    mode: string;
    status: string;
    more?: boolean;
  }): Promise<DiscoveryResult> {
    const filters = new URLSearchParams({
      q: input.q,
      m: input.mode === "any" ? "" : input.mode,
      s: input.status === "any" ? "any" : input.status,
      sort: "relevance_desc",
    });
    const queryKey = createHash("sha256").update(filters.toString()).digest("hex");
    const cache = await this.catalog.call("discoveryGet", queryKey);
    if (!input.more && cache && Date.now() - Date.parse(cache.fetched_at) < 15 * 60000) {
      this.cacheHits++;
      return { cached: true, imported: 0, total: cache.total, hasMore: !!cache.cursor };
    }
    if (input.more && cache && !cache.cursor)
      return { cached: true, imported: 0, total: cache.total, hasMore: false };
    if (input.more && cache?.cursor) filters.set("cursor_string", cache.cursor);
    const flightKey = queryKey + ":" + (filters.get("cursor_string") || "first");
    if (this.inflight.has(flightKey)) return this.inflight.get(flightKey)!;
    const run = async () => {
      if (this.busy)
        throw new ApiError("Une découverte est déjà en cours. Réessayer après sa fin.", 429);
      this.busy = true;
      try {
        const token = await this.accessToken();
        this.reserve();
        const response = await fetch("https://osu.ppy.sh/api/v2/beatmapsets/search?" + filters, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: AbortSignal.timeout(20000),
        });
        if (response.status === 429) {
          const retry = Number(response.headers.get("retry-after"));
          this.blockedUntil =
            Date.now() + (Number.isFinite(retry) && retry > 0 ? Math.max(12, retry) : 60) * 1000;
          throw new ApiError("osu! demande de patienter avant une nouvelle requête.", 429);
        }
        if (response.status === 401) {
          this.reset();
          throw new ApiError("Authentification expirée. Réessayer après le délai réseau.", 401);
        }
        if (!response.ok)
          throw new ApiError(`Recherche osu! indisponible (${response.status}).`, 502);
        const data = (await response.json()) as DiscoveryResponse & { error?: string };
        if (!Array.isArray(data.beatmapsets) || data.error)
          throw new ApiError(data.error || "Réponse de recherche invalide.", 502);
        const imported = await this.catalog.call("remoteUpsert", data.beatmapsets);
        await this.catalog.call("discoveryPut", {
          key: queryKey,
          cursor: data.cursor_string || null,
          total: data.total || 0,
        });
        return { cached: false, imported, total: data.total || 0, hasMore: !!data.cursor_string };
      } finally {
        this.busy = false;
      }
    };
    const promise = run().finally(() => this.inflight.delete(flightKey));
    this.inflight.set(flightKey, promise);
    return promise;
  }
}
