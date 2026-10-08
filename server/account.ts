import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Settings, AccountProfile, AccountStatus } from '../shared/types';
import { ApiError } from './osu-api';

type Credentials = { accessToken: string; refreshToken: string; expiresAt: number; clientId: string; profile: AccountProfile; updatedAt: string };
type Pending = { state: string; expires: number; generation: number; clientId: string; clientSecret: string };
export class OsuAccount {
  private credentials: Credentials | null = null;
  private pending?: Pending;
  private exchanging = false;
  private generation = 0;
  private storage = Promise.resolve();
  private refresh?: Promise<AccountProfile>;
  private error: string | null = null;
  private readonly file: string;
  constructor(folder: string, private settings: () => Settings, readonly redirectUri: string) { this.file = path.join(folder, 'account.json'); }
  async load() {
    try {
      const value = JSON.parse(await readFile(this.file, 'utf8'));
      if (typeof value.accessToken === 'string' && typeof value.refreshToken === 'string' && Number.isFinite(value.expiresAt) && value.clientId === this.settings().clientId && Number.isInteger(value.profile?.id) && typeof value.profile?.username === 'string') this.credentials = value;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') this.error = 'Account cache could not be loaded. Connect again.'; }
  }
  status(): AccountStatus {
    return { configured: !!this.settings().clientId && !!this.settings().clientSecret, connected: !!this.credentials,
      pending: this.exchanging || !!this.pending && this.pending.expires > Date.now(), profile: this.credentials?.profile || null,
      updatedAt: this.credentials?.updatedAt || null, redirectUri: this.redirectUri, error: this.error };
  }
  begin() {
    const settings = this.settings();
    if (!settings.clientId || !settings.clientSecret) throw new ApiError('Configure your osu! Client ID and secret in Settings first.');
    if (this.exchanging) throw new ApiError('Account connection is already in progress.', 409);
    this.generation++; this.error = null;
    this.pending = { state: randomBytes(32).toString('hex'), expires: Date.now() + 10 * 60000, generation: this.generation, clientId: settings.clientId, clientSecret: settings.clientSecret };
    const params = new URLSearchParams({ client_id: settings.clientId, redirect_uri: this.redirectUri, response_type: 'code', scope: 'public identify', state: this.pending.state });
    return { url: 'https://osu.ppy.sh/oauth/authorize?' + params };
  }
  private async token(body: Record<string, unknown>) {
    const response = await fetch('https://osu.ppy.sh/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new ApiError(`osu! authorization failed (${response.status}).`, 502);
    const data = await response.json() as any;
    if (typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string' || !Number.isFinite(data.expires_in)) throw new ApiError('Invalid osu! authorization response.', 502);
    return { accessToken: data.access_token as string, refreshToken: data.refresh_token as string, expiresAt: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
  }
  private async profile(token: string): Promise<AccountProfile> {
    const response = await fetch('https://osu.ppy.sh/api/v2/me', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new ApiError(`osu! profile unavailable (${response.status}).`, response.status === 401 ? 401 : 502);
    const data = await response.json() as any;
    if (!Number.isInteger(data.id) || typeof data.username !== 'string') throw new ApiError('Invalid osu! profile response.', 502);
    return { id: data.id, username: data.username, avatarUrl: typeof data.avatar_url === 'string' && data.avatar_url.startsWith('https://') ? data.avatar_url : null,
      countryCode: typeof data.country_code === 'string' ? data.country_code : '', playmode: typeof data.playmode === 'string' ? data.playmode : 'osu',
      pp: typeof data.statistics?.pp === 'number' ? data.statistics.pp : null, globalRank: data.statistics?.global_rank ?? null };
  }
  private async store(value: Credentials, generation: number) {
    this.storage = this.storage.catch(() => {}).then(async () => {
      if (generation !== this.generation) return;
      await writeFile(this.file + '.tmp', JSON.stringify(value), { mode: 0o600 }); await rename(this.file + '.tmp', this.file);
      if (generation === this.generation) this.credentials = value;
    });
    await this.storage;
  }
  async callback(input: { state?: string; code?: string; error?: string }) {
    const pending = this.pending;
    if (!pending || pending.expires < Date.now() || !input.state || !/^[a-f0-9]{64}$/.test(input.state) || !timingSafeEqual(Buffer.from(input.state), Buffer.from(pending.state))) throw new ApiError('Invalid or expired authorization. Start the connection again.');
    this.pending = undefined;
    if (input.error || !input.code) { this.error = 'Authorization was cancelled or denied.'; throw new ApiError(this.error); }
    this.exchanging = true;
    try {
      const token = await this.token({ client_id: Number(pending.clientId), client_secret: pending.clientSecret, grant_type: 'authorization_code', code: input.code, redirect_uri: this.redirectUri });
      const profile = await this.profile(token.accessToken);
      if (pending.generation !== this.generation) throw new ApiError('Account connection was cancelled.');
      await this.store({ ...token, clientId: pending.clientId, profile, updatedAt: new Date().toISOString() }, pending.generation);
      this.error = null;
    } catch (error) { if (pending.generation === this.generation) this.error = (error as Error).message; throw error; }
    finally { this.exchanging = false; }
  }
  async updateProfile() {
    if (this.refresh) return this.refresh;
    const generation = this.generation;
    const run = async () => {
      const stored = this.credentials;
      if (!stored) throw new ApiError('Connect your osu! account first.', 401);
      let token = { accessToken: stored.accessToken, refreshToken: stored.refreshToken, expiresAt: stored.expiresAt };
      if (Date.now() >= stored.expiresAt) {
        const settings = this.settings();
        if (settings.clientId !== stored.clientId) throw new ApiError('OAuth settings changed. Connect again.', 401);
        token = await this.token({ client_id: Number(settings.clientId), client_secret: settings.clientSecret, grant_type: 'refresh_token', refresh_token: stored.refreshToken });
        // Save rotated tokens even if fetching the profile later fails.
        await this.store({ ...stored, ...token }, generation);
      }
      const profile = await this.profile(token.accessToken);
      if (generation !== this.generation) throw new ApiError('Account connection was cancelled.');
      await this.store({ ...stored, ...token, profile, updatedAt: new Date().toISOString() }, generation); this.error = null; return profile;
    };
    this.refresh = run().catch(error => { if (generation === this.generation) this.error = error.message; throw error; }).finally(() => { this.refresh = undefined; });
    return this.refresh;
  }
  async disconnect() {
    this.generation++; this.pending = undefined; this.credentials = null; this.error = null;
    this.storage = this.storage.catch(() => {}).then(async () => { await rm(this.file, { force: true }); await rm(this.file + '.tmp', { force: true }); }); await this.storage;
  }
}
