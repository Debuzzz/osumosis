import { Worker } from 'node:worker_threads';
import { realpath } from 'node:fs/promises';
import { within } from './stable';
import type { Catalog } from './catalog';
import type { Analysis, OsuClient } from '../shared/types';

export class Analyzer {
  private inflight = new Map<string, Promise<Analysis>>();
  constructor(private catalog: Catalog) {}
  async calculate(checksum: string, mods: string, client: OsuClient): Promise<Analysis> {
    const key = `${checksum}:${client}:${mods}:rosu-4-v2`;
    const cached = await this.catalog.call<Analysis | null>('analysisGet', key); if (cached) return cached;
    if (this.inflight.has(key)) return this.inflight.get(key)!;
    if (this.inflight.size >= 2) throw new Error('Deux analyses sont déjà en cours. Réessayer dans un instant.');
    const work = async () => {
      const resource = await this.catalog.call<{ path: string; folder: string }>('file', { key: checksum, kind: 'beatmap' });
      const actual = await realpath(resource.path), folder = await realpath(resource.folder);
      if (!within(folder, actual)) throw new Error('Fichier hors du dossier de la map.');
      const dev = import.meta.url.endsWith('.ts');
      const result = await new Promise<Analysis>((resolve, reject) => {
        const worker = new Worker(new URL(dev ? './analysis-worker.ts' : './analysis-worker.js', import.meta.url), { workerData: { file: actual, checksum, mods, client }, execArgv: dev ? ['--import', 'tsx'] : [], resourceLimits: { maxOldGenerationSizeMb: 256 } });
        const timer = setTimeout(() => { void worker.terminate(); reject(new Error('Analyse interrompue après 30 secondes.')); }, 30000);
        worker.once('message', message => { clearTimeout(timer); void worker.terminate(); message.error ? reject(new Error(message.error)) : resolve(message.result); });
        worker.once('error', error => { clearTimeout(timer); reject(error); });
        worker.once('exit', code => { clearTimeout(timer); if (code !== 0) reject(new Error(`Worker d’analyse arrêté (${code}).`)); });
      });
      await this.catalog.call('analysisPut', { key, checksum, result }); return result;
    };
    const promise = work().finally(() => this.inflight.delete(key)); this.inflight.set(key, promise); return promise;
  }
}
