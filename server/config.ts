import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { PublicSettings, Settings } from '../shared/types';

export const dataDir = path.resolve(process.env.OSUMOSIS_DATA ?? '.data');
export const defaults: Settings = {
  osuPath: '', songsPath: '', tosuUrl: 'ws://127.0.0.1:24050/websocket/v2', port: 3000,
  clientId: '', clientSecret: '', targetStars: 5.5, preferredMods: 'NM',
};
export async function loadSettings(): Promise<Settings> {
  await mkdir(dataDir, { recursive: true });
  try { return { ...defaults, ...JSON.parse(await readFile(path.join(dataDir, 'settings.json'), 'utf8')) }; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return { ...defaults }; }
}
export async function saveSettings(settings: Settings) {
  const target = path.join(dataDir, 'settings.json');
  await writeFile(target + '.tmp', JSON.stringify(settings, null, 2), { mode: 0o600 });
  await rename(target + '.tmp', target);
}
export function publicSettings(settings: Settings): PublicSettings {
  const { clientSecret, ...rest } = settings;
  return { ...rest, hasClientSecret: !!clientSecret };
}
export async function detectInstallations() {
  const candidates = [path.join(os.homedir(), 'AppData/Local/osu!'), path.join(os.homedir(), 'osu!'), 'C:/osu!', 'D:/osu!'];
  const found: string[] = [];
  for (const candidate of candidates) {
    try { await stat(path.join(candidate, 'osu!.db')); found.push(candidate); } catch { /* candidate is absent */ }
  }
  return found;
}
