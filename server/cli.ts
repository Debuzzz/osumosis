import { Catalog } from './catalog';
import { dataDir, loadSettings } from './config';
import path from 'node:path';

const settings = await loadSettings();
const input = process.argv[2];
if (input) { settings.osuPath = path.resolve(input); settings.songsPath = ''; }
const catalog = new Catalog(dataDir);
try {
  await catalog.ready;
  await new Promise<void>(async (resolve, reject) => {
    catalog.on('index', job => { console.log(`[${job.phase}] ${job.processed} maps · ${job.message}`); if (!job.running) job.phase === 'error' ? reject(new Error(job.message)) : resolve(); });
    try { await catalog.call('index', settings); } catch (error) { reject(error); }
  });
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
finally { await catalog.close(); }
