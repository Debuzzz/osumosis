import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import type { CaptureStatus, LiveState, Play, TosuDiagnostic } from '../shared/types';
import type { Catalog } from './catalog';

const blank: LiveState = { connected: false, state: 'Hors ligne', client: '', paused: false, map: null, play: null };
const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : 0;
const numberOr = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const text = (value: unknown) => typeof value === 'string' ? value : '';
const resultState = (number: unknown, name: string) => [7, 14, 17, 18].includes(Number(number)) || /result|ranking/i.test(name);
type Attempt = Omit<Play, 'id' | 'endedAt' | 'outcome'> & { lastTime: number; lastSample: number; lastScore: number; lastJudgments: number; observedGameplay: boolean };
type StartCandidate = { checksum: string; since: number; lastTime: number; score: number; judgments: number };
const judgmentCount = (hits: Record<string, number>) => ['0', '50', '100', '300', 'geki', 'katu'].reduce((sum, key) => sum + n(hits[key]), 0);

export class Tosu extends EventEmitter {
  live: LiveState = { ...blank };
  lastSeen: string | null = null;
  error: string | null = null;
  readonly diagnostics: TosuDiagnostic[] = [];
  private socket?: WebSocket;
  private statusSocket?: WebSocket;
  private retry?: NodeJS.Timeout;
  private statusRetry?: NodeJS.Timeout;
  private resultTimer?: NodeJS.Timeout;
  private generation = 0;
  private attempt: Attempt | null = null;
  private startCandidate: StartCandidate | null = null;
  private previousTime = 0;
  private previousChecksum = '';
  private previousState = '';
  private suppress = false;
  private statusNumber: number | null = null;
  private statusSeen = 0;
  private lastMode: CaptureStatus['mode'] = 'idle';
  private messages = 0;
  private saved = 0;
  private lastSavedAt: string | null = null;
  private saveError: string | null = null;
  private pending = new Set<Promise<void>>();
  private history: NonNullable<LiveState['history']> = [];
  private historySample = -Infinity;
  constructor(private catalog: Catalog) { super(); }

  private log(level: TosuDiagnostic['level'], event: string, message: string) {
    const entry = { time: new Date().toISOString(), level, event, message };
    this.diagnostics.push(entry); if (this.diagnostics.length > 80) this.diagnostics.shift();
    this.emit('diagnostic', entry);
  }
  get capture(): CaptureStatus {
    const connected = this.statusSocket?.readyState === WebSocket.OPEN && Date.now() - this.statusSeen < 3000;
    const mode = this.lastMode;
    return { mode, active: !!this.attempt, partial: !!this.attempt?.partial, messages: this.messages, saved: this.saved,
      lastSavedAt: this.lastSavedAt, error: this.saveError || this.error, statusConnected: !!connected,
      reason: this.saveError ? 'Échec de sauvegarde : voir le diagnostic.' : mode === 'replay' ? 'Lecture replay : aucune tentative ajoutée.' : this.attempt ? (this.resultTimer ? 'Finalisation du résultat…' : 'Tentative en cours de capture.') : mode === 'idle' ? 'En attente d’une partie.' : this.suppress ? 'Tentative déjà terminée ; en attente du prochain départ.' : this.startCandidate ? 'Synchronisation du départ de la map…' : 'En attente de la map et de ses données.',
    };
  }
  private publish() {
    this.live = { ...this.live, capture: this.capture, history: [...this.history], events: this.attempt ? this.attempt.events.filter(event => event.kind !== 'sample').slice(-300) : this.live.events || [] };
    this.emit('live', this.live);
  }
  connect(url: string) {
    void this.stop(); const generation = ++this.generation;
    const open = () => {
      if (generation !== this.generation) return;
      this.socket = new WebSocket(url, { maxPayload: 4 * 1024 * 1024 });
      this.socket.on('open', () => { this.error = null; this.live = { ...this.live, connected: true }; this.log('info', 'connected', 'Flux tosu v2 connecté.'); this.publish(); });
      this.socket.on('message', bytes => {
        if (generation !== this.generation) return;
        try {
          const raw = JSON.parse(bytes.toString());
          if (!raw.beatmap || !raw.state) throw new Error('Flux v2 attendu : beatmap/state absents.');
          this.accept(raw);
        } catch (error) {
          const message = `Télémétrie : ${(error as Error).message}`;
          if (message !== this.error) this.log('warn', 'invalid-message', message);
          this.error = message; this.publish();
        }
      });
      this.socket.on('error', () => { this.error = 'tosu non disponible sur cette adresse.'; this.log('warn', 'connection-error', this.error); this.publish(); });
      this.socket.on('close', () => {
        if (generation !== this.generation) return;
        void this.finish('interrupted'); this.suppress = true; this.lastMode = 'idle';
        this.live = { ...blank }; this.log('warn', 'disconnected', 'Flux tosu interrompu ; reconnexion dans 5 secondes.'); this.publish();
        this.retry = setTimeout(open, 5000); this.retry.unref();
      });
    };
    // v2 exposes replay UI visibility, not a reliable replay flag. SC has status 2 (play) / 8 (watching).
    const statusUrl = new URL(url); statusUrl.pathname = '/tokens';
    const openStatus = () => {
      if (generation !== this.generation) return;
      const socket = this.statusSocket = new WebSocket(statusUrl, { maxPayload: 4 * 1024 * 1024 });
      socket.on('open', () => { socket.send('applyFilters:["status"]'); this.log('info', 'status-connected', 'Statut partie/replay tosu connecté.'); });
      socket.on('message', bytes => {
        if (generation !== this.generation) return;
        try {
          const raw = JSON.parse(bytes.toString()), status = Number(raw.status);
          if (!Number.isFinite(status) || raw.status === undefined) return;
          this.statusNumber = status; this.statusSeen = Date.now();
          if (status === 8) {
            this.lastMode = 'replay';
            if (this.attempt) { this.attempt = null; this.clearResultTimer(); this.log('info', 'replay-excluded', 'Lecture replay détectée : capture de tentative annulée.'); }
          }
        } catch { /* v2 remains usable if this auxiliary stream is unavailable. */ }
      });
      socket.on('error', () => {});
      socket.on('close', () => {
        if (generation !== this.generation) return;
        this.statusNumber = null; this.statusSeen = 0;
        this.log('warn', 'status-unavailable', 'Statut partie/replay indisponible ; le mode de capture sera signalé comme non confirmé.');
        this.statusRetry = setTimeout(openStatus, 5000); this.statusRetry.unref();
      });
    };
    open(); openStatus();
  }
  private accept(raw: any) {
    this.lastSeen = new Date().toISOString(); this.messages++; this.error = null;
    const b = raw.beatmap, p = raw.play || {}, state = text(raw.state?.name) || String(raw.state?.number ?? '');
    const playing = Number(raw.state?.number) === 2 || /^(playing|play)$/i.test(state);
    const completed = resultState(raw.state?.number, state);
    const statusFresh = Date.now() - this.statusSeen < 3000;
    const replay = /replay|spectat|watch/i.test(state) || raw.game?.isReplay === true || (statusFresh && this.statusNumber === 8);
    const mode: CaptureStatus['mode'] = playing ? replay ? 'replay' : statusFresh && this.statusNumber === 2 ? 'play' : 'unknown' : completed ? this.lastMode : 'idle';
    const result = completed ? raw.resultsScreen : null;
    const resultReady = result && (n(result.score) > 0 || Object.entries(result.hits || {}).some(([key, value]) => ['0', '50', '100', '300', 'geki', 'katu'].includes(key) && n(value) > 0));
    const hits = Object.fromEntries(Object.entries(resultReady ? result.hits : p.hits || {}).map(([key, value]) => [key, n(value)]));
    const mods = text((resultReady ? result.mods : p.mods)?.name) || 'NM';
    const stats = b.stats || {};
    const current = resultReady ? result : p;
    const next: LiveState = {
      connected: true, state, client: text(raw.client) || 'stable', paused: playing && !!raw.game?.paused,
      map: b.checksum ? { checksum: text(b.checksum).toLowerCase(), id: n(b.id), title: text(b.title), artist: text(b.artist), version: text(b.version), time: n(b.time?.live), firstObject: n(b.time?.firstObject), duration: n(b.time?.lastObject), stars: n(stats.stars?.total), mapper: text(b.mapper), bpm: n(stats.bpm?.realtime) || n(stats.bpm?.common), ar: n(stats.ar?.converted), cs: n(stats.cs?.converted), od: n(stats.od?.converted), hp: n(stats.hp?.converted), maxCombo: n(stats.maxCombo) } : null,
      play: { accuracy: n(current.accuracy), combo: resultReady ? n(result.maxCombo) : n(p.combo?.current), maxCombo: resultReady ? n(result.maxCombo) : n(p.combo?.max), misses: n(hits['0']), sliderBreaks: n(p.hits?.sliderBreaks), pp: n(current.pp?.current), fcPp: n(current.pp?.fc), ur: n(p.unstableRate), health: n(p.healthBar?.normal), mods, hits, score: n(current.score), rank: text(resultReady ? result.rank : p.rank?.current), maxPp: n(p.pp?.maxAchievable) },
      ppScenarios: [95, 97, 98, 99, 100].filter(accuracy => Number.isFinite(raw.performance?.accuracy?.[accuracy])).map(accuracy => ({ accuracy, pp: n(raw.performance.accuracy[accuracy]) })),
    };
    const checksum = next.map?.checksum || '', time = next.map?.time || 0;
    const retry = playing && !replay && !next.paused && time < this.previousTime - 1500 && checksum === this.previousChecksum;
    if (this.attempt && (checksum !== this.attempt.checksum || retry || (playing && this.resultTimer))) {
      if (retry && !this.attempt.observedGameplay && !this.resultTimer) {
        // A new play can briefly retain the song-selection clock and previous score.
        // Its first clock reset is synchronization, not a played retry.
        this.attempt = null;
        this.log('info', 'capture-resynced', 'Horloge de départ resynchronisée sans activité de jeu observée ; aucun retry enregistré.');
      } else void this.finish(this.resultTimer ? 'completed' : retry ? 'retry' : 'abandoned');
    }
    if (!playing || retry || checksum !== this.previousChecksum) this.suppress = false;
    if (playing && replay && this.attempt) { this.attempt = null; this.clearResultTimer(); this.log('info', 'replay-excluded', 'Lecture replay exclue du journal des tentatives.'); }
    if (!playing || replay || checksum !== this.startCandidate?.checksum || retry) this.startCandidate = null;
    let startReady = false;
    let startObservedGameplay = false;
    if (playing && !replay && next.map && !this.attempt && !this.suppress) {
      const play = next.play!, judgments = judgmentCount(play.hits);
      if (!this.startCandidate) this.startCandidate = { checksum, since: Date.now(), lastTime: time, score: n(play.score), judgments };
      const candidate = this.startCandidate;
      // Wait for asynchronously updated state, clock and score to agree before capturing.
      if (time < candidate.lastTime - 250 || n(play.score) < candidate.score || judgments < candidate.judgments) {
        Object.assign(candidate, { since: Date.now(), score: n(play.score), judgments });
      }
      candidate.lastTime = time;
      const progressed = n(play.score) > candidate.score || judgments > candidate.judgments;
      startObservedGameplay = progressed;
      const atStart = time <= n(next.map.firstObject) + 1500 && judgments === 0 && n(play.score) === 0;
      const validClock = !next.map.duration || time <= next.map.duration + 1500;
      startReady = !next.paused && p.failed !== true && validClock && Date.now() - candidate.since >= 350 && (atStart || progressed);
    }
    if (startReady && next.map) {
      const play = next.play!;
      this.attempt = { checksum, title: next.map.title, artist: next.map.artist, version: next.map.version, startedAt: this.lastSeen, mods, client: next.client, accuracy: play.accuracy, combo: play.maxCombo, misses: play.misses, sliderBreaks: play.sliderBreaks, pp: play.pp, ur: play.ur, duration: 0, events: [], lastTime: time, lastSample: -Infinity, lastScore: n(play.score), lastJudgments: judgmentCount(play.hits), observedGameplay: startObservedGameplay, partial: time > n(next.map.firstObject) + 1500 || judgmentCount(play.hits) > 0, sourceConfirmed: mode === 'play' };
      this.startCandidate = null;
      this.log('info', 'capture-started', `Capture démarrée (${next.client}, ${mode === 'play' ? 'partie' : 'mode non confirmé'}${this.attempt.partial ? ', partielle' : ''}).`);
    }
    if (this.attempt && playing && !replay) {
      const a = this.attempt, play = next.play!;
      if (n(play.score) > a.lastScore || judgmentCount(play.hits) > a.lastJudgments) a.observedGameplay = true;
      a.lastScore = n(play.score); a.lastJudgments = judgmentCount(play.hits);
      if (mode === 'play') a.sourceConfirmed = true;
      const event = (kind: string, count: number) => { if (a.events.length < 12000) a.events.push({ time, kind, count, accuracy: play.accuracy, combo: play.combo, pp: play.pp, fcPp: play.fcPp, intervalStart: a.lastTime, confidence: 'observed-interval' }); };
      if (play.misses > a.misses) event('miss', play.misses - a.misses);
      if (play.sliderBreaks > a.sliderBreaks) event('sliderbreak', play.sliderBreaks - a.sliderBreaks);
      if (time - a.lastSample >= 1000 && !next.paused) { event('sample', 0); a.lastSample = time; }
      Object.assign(a, { accuracy: play.accuracy, combo: Math.max(a.combo, play.maxCombo, play.combo), misses: play.misses, sliderBreaks: play.sliderBreaks, pp: play.pp, ur: play.ur, duration: Math.max(a.duration, Math.round(time)), lastTime: time, snapshot: { map: { ...next.map! }, play: { ...play, hits: { ...play.hits } }, ppScenarios: next.ppScenarios?.length ? next.ppScenarios : a.snapshot?.ppScenarios } });
      if (p.failed === true) { void this.finish('failed'); this.suppress = true; }
    }
    if (this.attempt && !playing) {
      if (completed) {
        if (resultReady) {
          const a = this.attempt, accuracy = numberOr(result.accuracy, a.accuracy), pp = numberOr(result.pp?.current, a.pp);
          const misses = numberOr(result.hits?.['0'], a.misses), duration = Math.max(a.duration, Math.round(next.map?.duration || 0));
          if (misses > a.misses && a.events.length < 12000) a.events.push({ time: duration, kind: 'miss', count: misses - a.misses, accuracy, combo: n(result.maxCombo), pp, fcPp: next.play!.fcPp, intervalStart: a.lastTime, confidence: 'observed-interval' });
          Object.assign(a, { accuracy, combo: Math.max(n(result.maxCombo), a.combo), misses, pp, duration, mods: text(result.mods?.name) || a.mods,
            snapshot: { map: { ...next.map! }, play: { ...next.play!, fcPp: numberOr(result.pp?.fc, a.snapshot?.play.fcPp || 0), rank: text(result.rank) || a.snapshot?.play.rank, hits: { ...next.play!.hits } }, ppScenarios: next.ppScenarios?.length ? next.ppScenarios : a.snapshot?.ppScenarios } });
        }
        // The result packet may arrive after the first state transition. Keep collecting it briefly.
        if (!this.resultTimer) this.resultTimer = setTimeout(() => { this.resultTimer = undefined; void this.finish('completed'); this.publish(); }, 800);
      } else void this.finish(this.resultTimer ? 'completed' : 'abandoned');
    }
    if (checksum !== this.previousChecksum || retry || (playing && this.previousState !== state) || (time < this.previousTime - 1500 && replay)) { this.history = []; this.historySample = -Infinity; }
    if ((playing && !next.paused) || (completed && resultReady)) {
      if (time >= 0 && (time - this.historySample >= 500 || completed && this.previousState !== state)) {
        this.history.push({ time, pp: next.play!.pp, fcPp: next.play!.fcPp, accuracy: next.play!.accuracy });
        if (this.history.length > 1800) this.history.shift(); this.historySample = time;
      }
    }
    if (state !== this.previousState || mode !== this.lastMode) this.log('info', 'state', `État ${state} · ${mode}.`);
    const resetEvents = checksum !== this.previousChecksum || retry || (playing && this.previousState !== state);
    next.events = this.attempt ? this.attempt.events.filter(event => event.kind !== 'sample').slice(-300) : resetEvents ? [] : this.live.events || [];
    this.lastMode = mode; this.live = next; this.previousChecksum = checksum; this.previousTime = time; this.previousState = state;
    this.publish();
  }
  private clearResultTimer() { if (this.resultTimer) clearTimeout(this.resultTimer); this.resultTimer = undefined; }
  private finish(outcome: string): Promise<void> {
    this.clearResultTimer();
    const a = this.attempt; if (!a) return Promise.resolve(); this.attempt = null;
    if (a.duration <= 0 || outcome !== 'completed' && !a.observedGameplay) { this.log('info', 'capture-empty', 'Capture sans activité de jeu observée ; aucune tentative ajoutée.'); return Promise.resolve(); }
    // Preserve the exact counters and final telemetry without changing earlier captures.
    if (a.snapshot) {
      a.snapshot.map.time = a.duration;
      Object.assign(a.snapshot.play, { accuracy: a.accuracy, maxCombo: a.combo, misses: a.misses, sliderBreaks: a.sliderBreaks, pp: a.pp, ur: a.ur, mods: a.mods });
    }
    if (a.events.length < 12000) a.events.push({ time: a.duration, kind: 'sample', count: 0, accuracy: a.accuracy, combo: a.combo, pp: a.pp, fcPp: a.snapshot?.play.fcPp, intervalStart: a.lastTime, confidence: 'observed-interval' });
    this.live.events = a.events.filter(event => event.kind !== 'sample').slice(-300);
    const { lastTime, lastSample, lastScore, lastJudgments, observedGameplay, ...play } = a;
    const saving = (async () => {
      try {
        const id = await this.catalog.call('savePlay', { ...play, outcome, endedAt: new Date().toISOString() });
        this.saved++; this.lastSavedAt = new Date().toISOString(); this.saveError = null;
        this.log('info', 'play-saved', `Tentative #${id} enregistrée (${outcome}).`); this.emit('saved', id);
      } catch (error) { this.saveError = `Enregistrement : ${(error as Error).message}`; this.log('error', 'save-failed', this.saveError); }
      this.publish();
    })();
    this.pending.add(saving); void saving.finally(() => this.pending.delete(saving)); return saving;
  }
  async stop() {
    this.generation++; if (this.retry) clearTimeout(this.retry); if (this.statusRetry) clearTimeout(this.statusRetry);
    for (const socket of [this.socket, this.statusSocket]) if (socket) { socket.removeAllListeners(); socket.on('error', () => {}); socket.close(); }
    this.socket = this.statusSocket = undefined;
    const outcome = this.resultTimer ? 'completed' : 'interrupted';
    void this.finish(outcome); this.live = { ...blank }; this.statusNumber = null; this.statusSeen = 0; this.lastMode = 'idle';
    this.startCandidate = null;
    this.previousState = ''; this.previousChecksum = ''; this.previousTime = 0; this.suppress = false; this.history = []; this.historySample = -Infinity;
    await Promise.all([...this.pending]);
  }
}
