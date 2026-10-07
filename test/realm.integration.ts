import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Catalog } from '../server/catalog';
import type { Collection, Job, SearchResult } from '../shared/types';
import { beatmap, md5, storeLazerFile } from './fixtures';

test('a real Realm snapshot imports lazer maps, hashed media and collections without modifying the source', { timeout: 30000 }, async () => {
  const { default: Realm } = await import('realm');
  const root = await mkdtemp(path.join(os.tmpdir(), 'osumosis-realm-'));
  let catalog: Catalog | undefined;
  try {
    const files = path.join(root, 'files');
    const [map, audio, background] = await Promise.all([storeLazerFile(files, beatmap), storeLazerFile(files, 'audio'), storeLazerFile(files, 'image')]);
    const source = path.join(root, 'client_52.realm');
    const realm = new Realm({ path: source, schemaVersion: 52, schema: [
      { name: 'RealmFile', primaryKey: 'Hash', properties: { Hash: 'string' } },
      { name: 'RealmNamedFileUsage', embedded: true, properties: { Filename: 'string', File: 'RealmFile' } },
      { name: 'BeatmapSet', primaryKey: 'ID', properties: { ID: 'string', OnlineID: 'int', DeletePending: 'bool', Files: 'RealmNamedFileUsage[]' } },
      { name: 'Beatmap', primaryKey: 'MD5Hash', properties: { Hash: 'string', MD5Hash: 'string', StarRating: 'double', Status: 'int', OnlineID: 'int', BeatmapSet: 'BeatmapSet?' } },
      { name: 'BeatmapCollection', properties: { Name: 'string', BeatmapMD5Hashes: 'string[]' } },
    ] });
    try {
      realm.write(() => {
        const mapFile = realm.create('RealmFile', { Hash: map.hash });
        const audioFile = realm.create('RealmFile', { Hash: audio.hash });
        const backgroundFile = realm.create('RealmFile', { Hash: background.hash });
        const set = realm.create('BeatmapSet', { ID: 'fixture-set', OnlineID: 456, DeletePending: false, Files: [
          { Filename: 'fixture.osu', File: mapFile }, { Filename: 'media/song.ogg', File: audioFile }, { Filename: 'background.jpg', File: backgroundFile },
        ] });
        realm.create('Beatmap', { Hash: map.hash, MD5Hash: md5(beatmap), StarRating: 4.5, Status: 1, OnlineID: 123, BeatmapSet: set });
        realm.create('BeatmapCollection', { Name: 'Farm', BeatmapMD5Hashes: [md5(beatmap), '0'.repeat(32)] });
      });
    } finally { realm.close(); }
    const digest = async () => createHash('sha256').update(await readFile(source)).digest('hex');
    const before = await digest();
    catalog = new Catalog(path.join(root, 'data')); await catalog.ready;
    const client = catalog;
    const index = () => new Promise<void>((resolve, reject) => {
      const done = (job: Job) => {
        if (job.phase === 'error') { client.off('index', done); reject(new Error(job.message)); }
        if (job.phase === 'done') { client.off('index', done); job.errors ? reject(new Error(job.message)) : resolve(); }
      };
      client.on('index', done);
      void client.call('index', { client: 'lazer', osuPath: root, songsPath: '' }).catch(reject);
    });
    await index();
    const result = await catalog.call<SearchResult>('search', { source: 'local' });
    assert.equal(result.total, 1); assert.equal(result.maps[0].stars, 4.5);
    assert.equal(result.maps[0].local, true); assert.deepEqual(result.maps[0].collections, ['Farm']);
    const collections = await catalog.call<Collection[]>('collections');
    assert.equal(collections[0].total, 2); assert.equal(collections[0].installed, 1);
    const asset = await catalog.call<{ path: string; folder: string; name: string }>('file', { key: md5(beatmap), kind: 'audio' });
    assert.deepEqual(asset, { path: audio.file, folder: files, name: 'media/song.ogg' });
    await index();
    assert.equal((await catalog.call<SearchResult>('search', { source: 'local' })).total, 1);
    assert.equal((await catalog.call<Collection[]>('collections')).length, 1);
    assert.deepEqual(await readdir(path.join(root, 'data', 'snapshots')), []);
    assert.equal(await digest(), before);
  } finally { await catalog?.close(); Realm.shutdown(); await rm(root, { recursive: true, force: true }); }
});
