#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
process.title = 'osumosis';
if (process.argv[2] === 'stop') {
  const runtime = path.resolve(process.env.OSUMOSIS_DATA || '.data', 'service.json');
  try {
    const { port } = JSON.parse(readFileSync(runtime, 'utf8'));
    const origin = `http://127.0.0.1:${Number(port)}`;
    const response = await fetch(origin + '/api/status', { signal: AbortSignal.timeout(5000) });
    const status = await response.json();
    if (status.app !== 'osumosis') throw new Error('Ce port ne correspond pas à osu!mosis.');
    const stop = await fetch(origin + '/api/shutdown', { method: 'POST', headers: { 'X-osumosis': '1', 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(5000) });
    if (!stop.ok) throw new Error('Arrêt refusé par le service.');
    console.log('osu!mosis : arrêt demandé.');
  } catch (error) { console.error('osu!mosis :', error.message); process.exitCode = 1; }
} else {
const entry = path.join(root, 'dist/server/index.js');
if (!existsSync(entry)) {
  console.error('osu!mosis : lancez ./osumosis.ps1 build avant le premier démarrage.');
  process.exit(1);
}
await import(pathToFileURL(entry).href);
}
