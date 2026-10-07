import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { createReadStream, existsSync, watch, type FSWatcher } from 'node:fs';
import { realpath, stat, writeFile } from 'node:fs/promises';
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

process.title = 'osumosis';
let settings = await loadSettings();
const port = Number(process.env.OSUMOSIS_PORT || settings.port);
const catalog = new Catalog(dataDir); await catalog.ready;
const analyzer = new Analyzer(catalog); const tosu = new Tosu(catalog);
const osu = new OsuApi(catalog, () => settings);
const covers = new Covers(dataDir);
const app = Fastify({ logger: { level: 'warn', redact: ['req.headers.authorization', 'req.body.clientSecret'] }, bodyLimit: 1024 * 1024 });
const sockets = new Set<WebSocket>(); let broadcastTime = 0;
const sourceSchema = z.enum(['local', 'cached', 'new', 'all']);
const modeSchema = z.enum(['any', '0', '1', '2', '3']);
const statusSchema = z.enum(['any', 'ranked', 'approved', 'qualified', 'loved', 'pending', 'wip', 'graveyard', 'unknown', 'unsubmitted']);
const searchSchema = z.object({ q: z.string().max(2000).default(''), source: sourceSchema.default('local'), mode: modeSchema.default('any'), status: statusSchema.default('any'), collection: z.string().regex(/^\d*$/).default(''), sort: z.enum(['title', 'artist', 'difficulty', 'length', 'bpm', 'recent', 'played']).default('title'), page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(48) });
const settingsSchema = z.object({
  osuPath: z.string().max(1024), songsPath: z.string().max(1024),
  tosuUrl: z.string().url().refine(v => { const u = new URL(v); return ['ws:', 'wss:'].includes(u.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname); }, 'tosu doit utiliser une adresse locale ws://.'),
  clientId: z.string().regex(/^\d*$/), clientSecret: z.string().max(1024).optional(),
  targetStars: z.number().min(0).max(20), preferredMods: z.enum(['NM', 'HD', 'HR', 'DT', 'HDDT', 'HDHR', 'HT', 'EZ']),
});
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
await app.register(websocket, { options: { maxPayload: 16384 } });
function broadcast(type: string, data: unknown) {
  const message = JSON.stringify({ type, data });
  for (const socket of sockets) if (socket.readyState === 1 && socket.bufferedAmount < 1024 * 1024) socket.send(message);
}
app.get('/ws', { websocket: true }, socket => { sockets.add(socket); socket.send(JSON.stringify({ type: 'live', data: tosu.live })); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => sockets.delete(socket)); });
tosu.on('live', live => { if (Date.now() - broadcastTime > 100) { broadcast('live', live); broadcastTime = Date.now(); } });
tosu.on('saved', id => broadcast('play-saved', id));
catalog.on('index', data => broadcast('index', data));
catalog.on('failure', error => console.error('Catalogue :', error.message));

app.get('/api/status', async () => ({ app: 'osumosis', ...(await catalog.call('status')), tosu: { connected: tosu.live.connected, lastSeen: tosu.lastSeen, error: tosu.error }, api: osu.status() }));
app.post('/api/shutdown', async (_, reply) => { reply.send({ stopping: true }); setImmediate(() => { void app.close(); }); });
app.get('/api/settings', async () => ({ settings: publicSettings(settings), detectedPaths: await detectInstallations() }));
app.put('/api/settings', async request => {
  const input = settingsSchema.parse(request.body);
  settings = { ...settings, ...input, clientSecret: input.clientSecret === undefined || input.clientSecret === '' ? settings.clientSecret : input.clientSecret };
  await saveSettings(settings); osu.reset(); tosu.connect(settings.tosuUrl); setupWatchers(); return publicSettings(settings);
});
app.get('/api/maps', request => catalog.call('search', searchSchema.parse(request.query)));
app.get('/api/maps/:key', request => catalog.call('detail', z.object({ key: z.string().max(100) }).parse(request.params).key));
app.get('/api/collections', () => catalog.call('collections'));
app.post('/api/index', () => catalog.call('index', settings));
app.get('/api/plays', () => catalog.call('plays'));
app.get('/api/live', async () => tosu.live);
app.post('/api/recommend', request => {
  const input = z.object({ source: sourceSchema.default('local'), target: z.number().min(0).max(20).default(settings.targetStars), mode: modeSchema.default('any'), q: z.string().max(2000).default(''), collection: z.string().regex(/^\d*$/).default(''), objective: z.enum(['farm', 'improve', 'discovery', 'training']).default('farm') }).parse(request.body);
  return catalog.call('recommend', input);
});
app.post('/api/discover', async request => {
  const input = z.object({ q: z.string().max(2000).default(''), mode: modeSchema.default('any'), status: statusSchema.default('any'), more: z.boolean().default(false) }).parse(request.body);
  // Local-only predicates are applied by the catalogue after discovery.
  const tokens = input.q.match(/(?:[^\s"']|"[^"]*"|'[^']*')+/g) || [];
  input.q = tokens.filter(t => !/^(local|played|collection|plays|objects|id)(?:>=|<=|!=|=|>|<|:)/i.test(t)).join(' ');
  return osu.discover(input);
});
app.post('/api/maps/:key/analysis', request => {
  const { key } = z.object({ key: z.string().max(100) }).parse(request.params);
  const { mods } = z.object({ mods: z.enum(['NM', 'HD', 'HR', 'DT', 'HDDT', 'HDHR', 'HT', 'EZ']).default('NM') }).parse(request.body || {});
  return analyzer.calculate(key, mods);
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
  const resource = await catalog.call<{ path: string; folder: string }>('file', { key, kind });
  const file = await realpath(resource.path), folder = await realpath(resource.folder);
  if (!within(folder, file)) return reply.code(403).send({ error: 'Fichier hors du dossier autorisé.' });
  const info = await stat(file); if (!info.isFile()) return reply.code(404).send({ error: 'Fichier absent.' });
  const extension = path.extname(file).toLowerCase();
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
  const schedule = () => { if (watchTimer) clearTimeout(watchTimer); watchTimer = setTimeout(() => { void catalog.call('index', settings).catch(error => console.warn(error.message)); }, 2500); watchTimer.unref(); };
  const songs = settings.songsPath || (settings.osuPath ? path.join(settings.osuPath, 'Songs') : '');
  try {
    if (songs && existsSync(songs)) { const watcher = watch(songs, { recursive: true }, (_, file) => { if (!file || /\.osu$/i.test(String(file))) schedule(); }); watcher.on('error', error => console.warn('Surveillance Songs :', error.message)); watchers.push(watcher); }
    if (settings.osuPath && existsSync(settings.osuPath)) { const watcher = watch(settings.osuPath, (_, file) => { if (file && /^(osu!|collection)\.db$/i.test(String(file))) schedule(); }); watcher.on('error', error => console.warn('Surveillance osu! :', error.message)); watchers.push(watcher); }
  } catch (error) { console.warn('Surveillance indisponible :', (error as Error).message); }
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web');
if (existsSync(root)) {
  await app.register(fastifyStatic, { root, prefix: '/' });
  app.setNotFoundHandler((request, reply) => request.url.startsWith('/api/') ? reply.code(404).send({ error: 'Route introuvable.' }) : reply.sendFile('index.html'));
} else app.get('/', async (_, reply) => reply.type('text/html').send('<h1>osu!mosis</h1><p>Frontend en développement : <a href="http://127.0.0.1:5173">ouvrir React</a>.</p>'));
app.addHook('onClose', async () => { await tosu.stop(); for (const watcher of watchers) watcher.close(); if (watchTimer) clearTimeout(watchTimer); for (const socket of sockets) socket.close(); await catalog.close(); });
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { if (!stopping) { stopping = true; void app.close(); } });
try {
  await app.listen({ host: '127.0.0.1', port });
  await writeFile(path.join(dataDir, 'service.json'), JSON.stringify({ port, pid: process.pid, startedAt: new Date().toISOString() }));
  tosu.connect(settings.tosuUrl); setupWatchers();
  console.log(`\n  osu!mosis  ·  your next good play\n  http://127.0.0.1:${port}\n  Données : ${dataDir}\n  tosu : ${settings.tosuUrl}\n`);
} catch (error) { await app.close(); throw error; }
