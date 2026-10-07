import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import type { LiveState, Play, PlayEvent } from '../shared/types';
import type { Catalog } from './catalog';

const blank: LiveState = { connected: false, state: 'Hors ligne', client: '', paused: false, map: null, play: null };
const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : 0;
export class Tosu extends EventEmitter {
  live: LiveState = { ...blank };
  lastSeen: string | null = null;
  error: string | null = null;
  private socket?: WebSocket;
  private retry?: NodeJS.Timeout;
  private generation = 0;
  private attempt: (Omit<Play, 'id' | 'endedAt' | 'outcome'> & { lastTime: number; lastSample: number }) | null = null;
  private previousTime = 0;
  private previousChecksum = '';
  private suppress = false;
  constructor(private catalog: Catalog) { super(); }
  connect(url: string) {
    this.stop(); const generation = ++this.generation;
    const open = () => {
      if (generation !== this.generation) return;
      this.socket = new WebSocket(url, { maxPayload: 4 * 1024 * 1024 });
      this.socket.on('open', () => { this.error = null; this.live = { ...this.live, connected: true }; this.emit('live', this.live); });
      this.socket.on('message', bytes => {
        try { const raw = JSON.parse(bytes.toString()); if (raw.beatmap && raw.state) this.accept(raw); }
        catch { this.error = 'Message tosu incomplet ou invalide.'; }
      });
      this.socket.on('error', () => { this.error = 'tosu non disponible sur cette adresse.'; });
      this.socket.on('close', () => {
        if (generation !== this.generation) return;
        void this.finish('interrupted'); this.suppress = true;
        this.live = { ...blank }; this.emit('live', this.live);
        this.retry = setTimeout(open, 5000); this.retry.unref();
      });
    };
    open();
  }
  private accept(raw: any) {
    this.lastSeen = new Date().toISOString();
    const b = raw.beatmap, p = raw.play || {}, state = raw.state?.name || String(raw.state?.number ?? '');
    const hits = p.hits || {}, mods = typeof p.mods?.name === 'string' ? p.mods.name || 'NM' : 'NM';
    const next: LiveState = {
      connected: true, state, client: String(raw.client || 'stable'), paused: !!raw.game?.paused,
      map: b.checksum ? { checksum: b.checksum, id: n(b.id), title: b.title || '', artist: b.artist || '', version: b.version || '', time: n(b.time?.live), duration: n(b.time?.lastObject), stars: n(b.stats?.stars?.total) } : null,
      play: { accuracy: n(p.accuracy), combo: n(p.combo?.current), maxCombo: n(p.combo?.max), misses: n(hits['0']), sliderBreaks: n(hits.sliderBreaks), pp: n(p.pp?.current), fcPp: n(p.pp?.fc), ur: n(p.unstableRate), health: n(p.healthBar?.normal), mods, hits },
    };
    const playing = raw.state?.number === 2 || /^(playing|play)$/i.test(state);
    const replay = !!raw.settings?.replayUIVisible || /replay|spectat/i.test(state);
    const checksum = next.map?.checksum || '', time = next.map?.time || 0;
    const retry = playing && !next.paused && time < 1500 && this.previousTime > 3000 && checksum === this.previousChecksum;
    if (this.attempt && (checksum !== this.attempt.checksum || retry)) void this.finish(retry ? 'retry' : 'abandoned');
    if (!playing || retry || checksum !== this.previousChecksum) this.suppress = false;
    if (playing && !replay && next.map && !this.attempt && !this.suppress) {
      this.attempt = { checksum, title: next.map.title, artist: next.map.artist, version: next.map.version, startedAt: new Date().toISOString(), mods, client: next.client, accuracy: 0, combo: 0, misses: 0, sliderBreaks: 0, pp: 0, ur: 0, duration: 0, events: [], lastTime: time, lastSample: -Infinity };
    }
    if (this.attempt && playing && !replay) {
      const a = this.attempt, play = next.play!;
      const event = (kind: string, count: number) => a.events.push({ time, kind, count, accuracy: play.accuracy, combo: play.combo, pp: play.pp, intervalStart: a.lastTime, confidence: 'observed-interval' });
      if (play.misses > a.misses) event('miss', play.misses - a.misses);
      if (play.sliderBreaks > a.sliderBreaks) event('sliderbreak', play.sliderBreaks - a.sliderBreaks);
      if (time - a.lastSample >= 1000 && !next.paused) { if (a.events.length < 12000) event('sample', 0); a.lastSample = time; }
      Object.assign(a, { accuracy: play.accuracy, combo: Math.max(a.combo, play.maxCombo, play.combo), misses: play.misses, sliderBreaks: play.sliderBreaks, pp: play.pp, ur: play.ur, duration: Math.max(a.duration, Math.round(time)), lastTime: time });
      if (p.failed) { void this.finish('failed'); this.suppress = true; }
    }
    if (this.attempt && !playing) {
      const result = raw.resultsScreen;
      const completed = raw.state?.number === 7 || /result/i.test(state);
      if (completed && result) Object.assign(this.attempt, { accuracy: n(result.accuracy) || this.attempt.accuracy, combo: Math.max(n(result.maxCombo), this.attempt.combo), misses: n(result.hits?.['0']), pp: n(result.pp?.current) || this.attempt.pp });
      void this.finish(completed ? 'completed' : 'abandoned');
    }
    this.live = next; this.previousChecksum = checksum; this.previousTime = time;
    this.emit('live', next);
  }
  private async finish(outcome: string) {
    const a = this.attempt; if (!a) return; this.attempt = null;
    if (a.duration <= 0 && !a.events.length) return;
    const { lastTime, lastSample, ...play } = a;
    try { const id = await this.catalog.call('savePlay', { ...play, outcome, endedAt: new Date().toISOString() }); this.emit('saved', id); }
    catch (error) { this.error = `Enregistrement : ${(error as Error).message}`; }
  }
  stop() {
    this.generation++; if (this.retry) clearTimeout(this.retry);
    if (this.socket) { this.socket.removeAllListeners(); this.socket.on('error', () => {}); this.socket.close(); this.socket = undefined; }
    const saved = this.finish('interrupted'); this.live = { ...blank }; return saved;
  }
}
