import { mkdir, readFile, writeFile, rename, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { DetectedLibraries, PublicSettings, Settings } from '../shared/types';
import { normalizeSettings } from './settings';

export const dataDir = path.resolve(process.env.OSUMOSIS_DATA ?? '.data');
export async function loadSettings(): Promise<Settings> {
  await mkdir(dataDir, { recursive: true });
  try { return normalizeSettings(JSON.parse(await readFile(path.join(dataDir, 'settings.json'), 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return normalizeSettings({}); }
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
  const found: DetectedLibraries = { stable: [], lazer: [] };
  for (const candidate of candidates) {
    try { await stat(path.join(candidate, 'osu!.db')); found.stable.push(candidate); } catch { /* candidate is absent */ }
  }
  const lazerCandidates = [path.join(os.homedir(), 'AppData/Roaming/osu'), path.join(os.homedir(), '.local/share/osu'), path.join(os.homedir(), 'Library/Application Support/osu')];
  for (const candidate of lazerCandidates) {
    try {
      const files = await readdir(candidate);
      if (files.some(name => /^client(?:_\d+)?\.realm$/.test(name)) && (await stat(path.join(candidate, 'files'))).isDirectory()) found.lazer.push(candidate);
    } catch { /* candidate is absent */ }
  }
  return found;
}
