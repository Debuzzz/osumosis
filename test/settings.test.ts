import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeSettings, selectedLibrary, settingsUpdateSchema } from '../server/settings';

test('new settings default to lazer with independent profiles', () => {
  const first = normalizeSettings({});
  assert.equal(first.client, 'lazer');
  first.libraries.stable.osuPath = 'modified';
  assert.equal(normalizeSettings({}).libraries.stable.osuPath, '');
  assert.deepEqual(selectedLibrary(first), { client: 'lazer', osuPath: '', songsPath: '' });
});

test('stable-only settings migrate without losing paths or shared settings', () => {
  const settings = normalizeSettings({ osuPath: 'C:/osu!', songsPath: 'D:/Songs', targetStars: 6, clientId: '123', clientSecret: 'fixture-only' });
  assert.equal(settings.client, 'stable');
  assert.deepEqual(settings.libraries.stable, { osuPath: 'C:/osu!', songsPath: 'D:/Songs' });
  assert.equal(settings.targetStars, 6);
  assert.equal(settings.clientSecret, 'fixture-only');
  assert.equal(settings.libraries.lazer.osuPath, '');
  assert.ok(!('osuPath' in settings));
});

test('round trips and switching preserve both profiles', () => {
  const settings = normalizeSettings({});
  settings.libraries.stable = { osuPath: 'C:/stable', songsPath: 'D:/Songs' };
  settings.libraries.lazer.osuPath = 'C:/lazer';
  const restored = normalizeSettings(JSON.parse(JSON.stringify(settings)));
  assert.deepEqual(selectedLibrary(restored), { client: 'lazer', osuPath: 'C:/lazer', songsPath: '' });
  restored.client = 'stable';
  assert.deepEqual(selectedLibrary(restored), { client: 'stable', osuPath: 'C:/stable', songsPath: 'D:/Songs' });
  assert.equal(restored.libraries.lazer.osuPath, 'C:/lazer');
});

test('invalid clients, profiles and non-local tosu URLs are rejected', () => {
  assert.throws(() => settingsUpdateSchema.parse({ ...normalizeSettings({}), client: 'unknown' }));
  assert.throws(() => normalizeSettings({ libraries: { lazer: { osuPath: 123 } } }));
  assert.throws(() => normalizeSettings({ libraries: 'invalid' }));
  assert.throws(() => normalizeSettings({ tosuUrl: 'wss://example.com/websocket/v2' }));
});
