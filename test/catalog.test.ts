import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, rm, writeFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Catalog } from '../server/catalog';
import { Analyzer } from '../server/analysis';
import type { Job, LibrarySelection, SearchResult } from '../shared/types';
import { beatmap, md5 } from './fixtures';

async function index(catalog: Catalog, selection: LibrarySelection) {
  await new Promise<void>((resolve, reject) => {
    const done = (job: Job) => {
      if (job.phase !== 'done' && job.phase !== 'error') return;
      catalog.off('index', done);
      job.phase === 'error' ? reject(new Error(job.message)) : resolve();
    };
    catalog.on('index', done);
    void catalog.call('index', selection).catch(error => { catalog.off('index', done); reject(error); });
  });
}

test('switching profiles retains cache but clears installed status; both scoring caches remain separate', { timeout: 30000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'osumosis-profiles-'));
  const songs = path.join(root, 'stable', 'Songs'); await mkdir(songs, { recursive: true });
  const file = path.join(songs, 'fixture.osu'); await writeFile(file, beatmap);
  const stable: LibrarySelection = { client: 'stable', osuPath: path.join(root, 'stable'), songsPath: '' };
  const lazer: LibrarySelection = { client: 'lazer', osuPath: path.join(root, 'lazer'), songsPath: '' };
  let catalog = new Catalog(path.join(root, 'data'));
  try {
    await catalog.ready; await catalog.call('selectLibrary', stable); await index(catalog, stable);
    assert.equal((await catalog.call<SearchResult>('search', { source: 'local' })).total, 1);
    const analyzer = new Analyzer(catalog);
    const [stableAnalysis, lazerAnalysis] = await Promise.all([analyzer.calculate(md5(beatmap), 'NM', 'stable'), analyzer.calculate(md5(beatmap), 'NM', 'lazer')]);
    assert.equal(stableAnalysis.client, 'stable'); assert.equal(lazerAnalysis.client, 'lazer');
    assert.ok(stableAnalysis.pp.every(item => Number.isFinite(item.pp)));
    assert.ok(lazerAnalysis.pp.some((item, i) => item.pp !== stableAnalysis.pp[i].pp));
    await unlink(file);
    // The persisted/API representation omits undefined optional strain fields.
    assert.equal(JSON.stringify(await analyzer.calculate(md5(beatmap), 'NM', 'stable')), JSON.stringify(stableAnalysis));
    assert.equal(JSON.stringify(await analyzer.calculate(md5(beatmap), 'NM', 'lazer')), JSON.stringify(lazerAnalysis));
    await writeFile(file, beatmap);
    await catalog.call('selectLibrary', lazer);
    assert.equal((await catalog.call<SearchResult>('search', { source: 'local' })).total, 0);
    assert.equal((await catalog.call<SearchResult>('search', { source: 'all' })).total, 1);
    await assert.rejects(catalog.call('file', { key: md5(beatmap), kind: 'beatmap' }), /non installée/);
    await catalog.call('selectLibrary', stable); await index(catalog, stable);
    assert.equal((await catalog.call<SearchResult>('search', { source: 'local' })).total, 1);
    await catalog.close(); catalog = new Catalog(path.join(root, 'data'));
    await catalog.ready; await catalog.call('selectLibrary', stable);
    assert.equal((await catalog.call<SearchResult>('search', { source: 'local' })).total, 1);
    const completed = index(catalog, stable);
    await assert.rejects(catalog.call('selectLibrary', lazer), /fin de l’indexation/);
    await completed;
  } finally { await catalog.close(); await rm(root, { recursive: true, force: true }); }
});

test('the CLI waits for the scan to finish and does not persist its profile override', { timeout: 30000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'osumosis-cli-'));
  const songs = path.join(root, 'stable', 'Songs'); await mkdir(songs, { recursive: true });
  await writeFile(path.join(songs, 'fixture.osu'), beatmap);
  const data = path.join(root, 'data'); let catalog: Catalog | undefined;
  try {
    const { stdout } = await promisify(execFile)(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../server/cli.ts', import.meta.url)), '--client', 'stable', path.join(root, 'stable')], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, OSUMOSIS_DATA: data } });
    assert.match(stdout, /\[done\]/);
    catalog = new Catalog(data); await catalog.ready;
    await catalog.call('selectLibrary', { client: 'stable', osuPath: path.join(root, 'stable'), songsPath: '' });
    assert.equal((await catalog.call<SearchResult>('search', { source: 'local' })).total, 1);
    const { stat } = await import('node:fs/promises');
    await assert.rejects(stat(path.join(data, 'settings.json')), { code: 'ENOENT' });
  } finally { await catalog?.close(); await rm(root, { recursive: true, force: true }); }
});
