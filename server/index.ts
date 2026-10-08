import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { createReadStream, existsSync, watch, type FSWatcher } from 'node:fs';
import { realpath, stat, writeFile, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z, ZodError } from 'zod';
import type WebSocket from 'ws';
import { Catalog } from './catalog';
import { Analyzer } from './analysis';
import { Tosu } from './tosu';
import { OsuApi, ApiError } from './osu-api';
import { dataDir, loadSettings, saveSettings, publicSettings, detectInstallations } from './config';
import { within } from './stable';
import { Covers } from './assets';
import { selectedLibrary, settingsUpdateSchema } from './settings';
import { TelemetryLog } from './telemetry-log';
import { OsuAccount } from './account';
import { searchTokens } from '../shared/search-query';

process.title = 'osumosis';
let settings = await loadSettings();
const port = Number(process.env.OSUMOSIS_PORT || settings.port);
const account = new OsuAccount(dataDir, () => settings, `http://127.0.0.1:${port}/api/account/callback`); await account.load();
const catalog = new Catalog(dataDir); await catalog.ready;
await catalog.call('selectLibrary', selectedLibrary(settings));
const analyzer = new Analyzer(catalog); const tosu = new Tosu(catalog);
const osu = new OsuApi(catalog, () => settings);
const covers = new Covers(dataDir);
const telemetryLog = new TelemetryLog(path.join(dataDir, 'tosu.log'));
const app = Fastify({ logger: { level: 'warn', redact: ['req.headers.authorization', 'req.body.clientSecret'] }, bodyLimit: 1024 * 1024 });
const sockets = new Set<WebSocket>(); let broadcastTime = 0;
const sourceSchema = z.enum(['local', 'cached', 'new', 'all']);
const modeSchema = z.enum(['any', '0', '1', '2', '3']);
const statusSchema = z.enum(['any', 'ranked', 'approved', 'qualified', 'loved', 'pending', 'wip', 'graveyard', 'unknown', 'unsubmitted']);
const searchSchema = z.object({ q: z.string().max(2000).default(''), source: sourceSchema.default('local'), mode: modeSchema.default('any'), status: statusSchema.default('any'), collection: z.string().regex(/^\d*$/).default(''), sort: z.enum(['title', 'artist', 'difficulty', 'length', 'bpm', 'recent', 'played']).default('title'), page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(48), group: z.enum(['maps', 'sets']).default('maps') });
app.addHook('onRequest', async (request, reply) => {
  const host = request.headers.host?.split(':')[0];
  if (!['127.0.0.1', 'localhost'].includes(host || '')) return reply.code(403).send({ error: 'Hôte non autorisé.' });
  const origin = request.headers.origin;
  if (origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`, 'http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin)) return reply.code(403).send({ error: 'Origine non autorisée.' });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers['x-osumosis'] !== '1') return reply.code(403).send({ error: 'En-tête de session locale manquant.' });
});
app.setErrorHandler((error, request, reply) => {
  const known = error instanceof ApiError || error instanceof ZodError;
  const message = error instanceof ZodError ? error.issues.map(i => `${i.path.join('.')} : ${i.message}`).join(' · ') : error instanceof Error ? error.message : 'Erreur du service local.';
  reply.code(error instanceof ApiError ? error.statusCode : known ? 400 : 400).send({ error: message || 'Erreur du service local.' });
});
app.addHook('onSend', async (_request, reply, payload) => {
  if (String(reply.getHeader('content-type') || '').includes('text/html')) reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self'; connect-src 'self' ipc: http://ipc.localhost ws://127.0.0.1:" + port + " ws://localhost:" + port + "; object-src 'none'; base-uri 'self'; frame-ancestors 'none'").header('Referrer-Policy', 'no-referrer');
  return payload;
});
await app.register(websocket, { options: { maxPayload: 16384 } });
function broadcast(type: string, data: unknown) {
  const message = JSON.stringify({ type, data });
  for (const socket of sockets) if (socket.readyState === 1 && socket.bufferedAmount < 1024 * 1024) socket.send(message);
}
app.get('/ws', { websocket: true }, socket => { sockets.add(socket); socket.send(JSON.stringify({ type: 'live', data: tosu.live })); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => sockets.delete(socket)); });
tosu.on('live', live => { if (Date.now() - broadcastTime > 100) { broadcast('live', live); broadcastTime = Date.now(); } });
tosu.on('saved', id => broadcast('play-saved', id));
tosu.on('diagnostic', entry => { telemetryLog.write(entry); broadcast('tosu-diagnostic', entry); });
catalog.on('index', data => broadcast('index', data));
catalog.on('failure', error => console.error('Catalogue :', error.message));

app.get('/api/status', async () => ({ app: 'osumosis', ...(await catalog.call('status')), tosu: { connected: tosu.live.connected, lastSeen: tosu.lastSeen, error: tosu.capture.error, capture: tosu.capture }, api: osu.status() }));
app.get('/api/tosu/diagnostics', async () => ({ capture: tosu.capture, lastSeen: tosu.lastSeen, events: [...tosu.diagnostics] }));
app.post('/api/shutdown', async (request, reply) => { if (process.env.OSUMOSIS_DESKTOP_INSTANCE && request.headers['x-osumosis-instance'] !== process.env.OSUMOSIS_DESKTOP_INSTANCE) return reply.code(403).send({ error: 'Desktop instance mismatch.' }); reply.send({ stopping: true }); setImmediate(() => { void app.close(); }); });
app.get('/api/settings', async () => ({ settings: publicSettings(settings), detectedPaths: await detectInstallations() }));
app.get('/api/account', async () => account.status());
app.post('/api/account/connect', async () => account.begin());
app.post('/api/account/disconnect', async () => { await account.disconnect(); return account.status(); });
app.post('/api/account/refresh', async () => { await account.updateProfile(); return account.status(); });
app.get('/api/account/callback', async (request, reply) => {
  reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer');
  try {
    await account.callback(z.object({ state: z.string().max(128).optional(), code: z.string().max(4096).optional(), error: z.string().max(200).optional() }).parse(request.query));
    broadcast('account-changed', true);
    return reply.type('text/html').send('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>osu!mosis</title><h1>Compte osu! connecté / osu! account connected</h1><p>Tu peux fermer cet onglet et revenir dans osu!mosis.<br>You can close this tab and return to osu!mosis.</p></html>');
  } catch {
    broadcast('account-changed', false);
    return reply.code(400).type('text/html').send('<!doctype html><html lang="fr"><meta charset="utf-8"><title>osu!mosis</title><h1>Connexion refusée ou expirée / Connection denied or expired</h1><p>Reviens dans osu!mosis pour relancer la connexion.<br>Return to osu!mosis to connect again.</p></html>');
  }
});
let savingSettings = false;
app.put('/api/settings', async request => {
  if (savingSettings) throw new Error('Une sauvegarde des réglages est déjà en cours.');
  const input = settingsUpdateSchema.parse(request.body);
  const next = { ...settings, ...input, clientSecret: input.clientSecret === undefined || input.clientSecret === '' ? settings.clientSecret : input.clientSecret };
  savingSettings = true;
  try {
    await catalog.call('selectLibrary', selectedLibrary(next));
    try { await saveSettings(next); }
    catch (error) { await catalog.call('selectLibrary', selectedLibrary(settings)); throw error; }
    if (next.clientId !== settings.clientId || next.clientSecret !== settings.clientSecret) await account.disconnect();
    settings = next; osu.reset(); tosu.connect(settings.tosuUrl); setupWatchers(); return publicSettings(settings);
  } finally { savingSettings = false; }
});
app.get('/api/maps', request => catalog.call('search', searchSchema.parse(request.query)));
app.get('/api/maps/:key', request => catalog.call('detail', z.object({ key: z.string().max(100) }).parse(request.params).key));
app.get('/api/collections', () => catalog.call('collections'));
app.post('/api/index', () => {
  if (savingSettings) throw new Error('Attendre la sauvegarde des réglages avant d’indexer.');
  return catalog.call('index', selectedLibrary(settings));
});
app.get('/api/plays', () => catalog.call('plays'));
app.get('/api/live', async () => tosu.live);
app.get('/api/live/background', async (request, reply) => {
  const { checksum } = z.object({ checksum: z.string().regex(/^[a-f0-9]{32}$/i) }).parse(request.query);
  if (tosu.live.map?.checksum !== checksum.toLowerCase()) return reply.code(404).send({ error: 'La map en direct a changé.' });
  // Prefer indexed media in the UI; this fallback only contacts the configured local tosu instance.
  const url = new URL(settings.tosuUrl); url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'; url.pathname = '/files/beatmap/background';
  try {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
    const mime = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || !mime || !['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'].includes(mime) || !response.body) { await response.body?.cancel(); return reply.code(404).send({ error: 'Fond indisponible auprès de tosu.' }); }
    const chunks: Uint8Array[] = []; let size = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > 16 * 1024 * 1024) { await reader.cancel(); throw new Error('Fond trop volumineux.'); } chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    if (tosu.live.map?.checksum !== checksum.toLowerCase()) return reply.code(404).send({ error: 'La map en direct a changé.' });
    return reply.type(mime).header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff').send(Buffer.concat(chunks));
  } catch { return reply.code(404).send({ error: 'Fond indisponible auprès de tosu.' }); }
});
app.post('/api/recommend', request => {
  const input = z.object({ source: sourceSchema.default('local'), target: z.number().min(0).max(20).default(settings.targetStars), mode: modeSchema.default('any'), q: z.string().max(2000).default(''), collection: z.string().regex(/^\d*$/).default(''), objective: z.enum(['farm', 'improve', 'discovery', 'training']).default('farm') }).parse(request.body);
  return catalog.call('recommend', input);
});
app.post('/api/discover', async request => {
  const input = z.object({ q: z.string().max(2000).default(''), mode: modeSchema.default('any'), status: statusSchema.default('any'), more: z.boolean().default(false) }).parse(request.body);
  // Local-only predicates are applied by the catalogue after discovery.
  const tokens = searchTokens(input.q);
  input.q = tokens.filter(t => !/^(local|played|collection|plays|objects|id)(?:>=|<=|!=|=|>|<|:)/i.test(t)).join(' ');
  return osu.discover(input);
});
app.post('/api/maps/:key/analysis', request => {
  const { key } = z.object({ key: z.string().max(100) }).parse(request.params);
  const { mods } = z.object({ mods: z.enum(['NM', 'HD', 'HR', 'DT', 'HDDT', 'HDHR', 'HT', 'EZ']).default('NM') }).parse(request.body || {});
  return analyzer.calculate(key, mods, settings.client);
});
app.get('/api/covers/:key', async (request, reply) => {
  const { key } = z.object({ key: z.string().max(100) }).parse(request.params);
  const { fetch: allow } = z.object({ fetch: z.enum(['0', '1']).default('0') }).parse(request.query);
  try {
    const url = await catalog.call<string | null>('cover', key); if (!url) return reply.code(404).send({ error: 'Miniature indisponible.' });
    const asset = await covers.get(url, allow === '1'); reply.type(asset.mime).header('Cache-Control', 'private, max-age=86400').header('X-Content-Type-Options', 'nosniff');
    return reply.send(createReadStream(asset.file));
  } catch { return reply.code(404).send({ error: 'Miniature absente du cache ou temporairement indisponible.' }); }
});
app.get('/api/assets/:key/:kind', async (request, reply) => {
  const { key, kind } = z.object({ key: z.string().max(100), kind: z.enum(['background', 'audio', 'beatmap']) }).parse(request.params);
  const resource = await catalog.call<{ path: string; folder: string; name: string }>('file', { key, kind });
  const file = await realpath(resource.path), folder = await realpath(resource.folder);
  if (!within(folder, file)) return reply.code(403).send({ error: 'Fichier hors du dossier autorisé.' });
  const info = await stat(file); if (!info.isFile()) return reply.code(404).send({ error: 'Fichier absent.' });
  const extension = path.extname(resource.name).toLowerCase();
  const mime: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.bmp': 'image/bmp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.osu': 'text/plain' };
  reply.header('Content-Type', mime[extension] || 'application/octet-stream').header('X-Content-Type-Options', 'nosniff').header('Cache-Control', 'private, max-age=3600').header('Accept-Ranges', 'bytes');
  const range = request.headers.range;
  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    let start = match?.[1] ? Number(match[1]) : 0;
    let end = match?.[2] ? Number(match[2]) : info.size - 1;
    if (match && !match[1] && match[2]) { start = Math.max(0, info.size - Number(match[2])); end = info.size - 1; }
    end = Math.min(end, info.size - 1);
    if (!match || start > end || start >= info.size) return reply.code(416).header('Content-Range', `bytes */${info.size}`).send();
    reply.code(206).header('Content-Range', `bytes ${start}-${end}/${info.size}`).header('Content-Length', end - start + 1);
    return reply.send(createReadStream(file, { start, end }));
  }
  reply.header('Content-Length', info.size); return reply.send(createReadStream(file));
});

let watchers: FSWatcher[] = []; let watchTimer: NodeJS.Timeout | undefined;
function setupWatchers() {
  for (const watcher of watchers) watcher.close(); watchers = [];
  if (watchTimer) clearTimeout(watchTimer);
  const schedule = () => { if (watchTimer) clearTimeout(watchTimer); watchTimer = setTimeout(() => { if (!savingSettings) void catalog.call('index', selectedLibrary(settings)).catch(error => console.warn(error.message)); }, 2500); watchTimer.unref(); };
  // Lazer is indexed manually from a closed-client snapshot; never continuously copy a live Realm.
  if (settings.client === 'lazer') return;
  const library = selectedLibrary(settings);
  const songs = library.songsPath || (library.osuPath ? path.join(library.osuPath, 'Songs') : '');
  try {
    if (songs && existsSync(songs)) { const watcher = watch(songs, { recursive: true }, (_, file) => { if (!file || /\.osu$/i.test(String(file))) schedule(); }); watcher.on('error', error => console.warn('Surveillance Songs :', error.message)); watchers.push(watcher); }
    if (library.osuPath && existsSync(library.osuPath)) { const watcher = watch(library.osuPath, (_, file) => { if (file && /^(osu!|collection)\.db$/i.test(String(file))) schedule(); }); watcher.on('error', error => console.warn('Surveillance osu! :', error.message)); watchers.push(watcher); }
  } catch (error) { console.warn('Surveillance indisponible :', (error as Error).message); }
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web');
if (existsSync(root)) {
  await app.register(fastifyStatic, { root, prefix: '/' });
  app.setNotFoundHandler((request, reply) => request.url.startsWith('/api/') ? reply.code(404).send({ error: 'Route introuvable.' }) : reply.sendFile('index.html'));
} else app.get('/', async (_, reply) => reply.type('text/html').send('<h1>osu!mosis</h1><p>Frontend en développement : <a href="http://127.0.0.1:5173">ouvrir React</a>.</p>'));
app.addHook('onClose', async () => { await tosu.stop(); await telemetryLog.close(); for (const watcher of watchers) watcher.close(); if (watchTimer) clearTimeout(watchTimer); for (const socket of sockets) socket.close(); await catalog.close(); try { const service = JSON.parse(await readFile(path.join(dataDir, 'service.json'), 'utf8')); if (service.pid === process.pid) await rm(path.join(dataDir, 'service.json'), { force: true }); } catch { /* No marker owned by this process. */ } });
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { if (!stopping) { stopping = true; void app.close(); } });
try {
  await app.listen({ host: '127.0.0.1', port });
  await writeFile(path.join(dataDir, 'service.json'), JSON.stringify({ port, pid: process.pid, instance: process.env.OSUMOSIS_DESKTOP_INSTANCE || null, startedAt: new Date().toISOString() }));
  tosu.connect(settings.tosuUrl); setupWatchers();
  console.log(`\n  osu!mosis  ·  your next good play\n  http://127.0.0.1:${port}\n  Données : ${dataDir}\n  tosu : ${settings.tosuUrl}\n`);
} catch (error) { await app.close(); throw error; }
