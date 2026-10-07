import { z } from 'zod';
import type { LibrarySelection, Settings } from '../shared/types';

export const defaults: Settings = {
  client: 'lazer',
  libraries: { stable: { osuPath: '', songsPath: '' }, lazer: { osuPath: '' } },
  tosuUrl: 'ws://127.0.0.1:24050/websocket/v2', port: 3000,
  clientId: '', clientSecret: '', targetStars: 5.5, preferredMods: 'NM',
};

export const settingsUpdateSchema = z.object({
  client: z.enum(['stable', 'lazer']),
  libraries: z.object({
    stable: z.object({ osuPath: z.string().max(1024), songsPath: z.string().max(1024) }),
    lazer: z.object({ osuPath: z.string().max(1024) }),
  }),
  tosuUrl: z.string().url().refine(value => {
    const url = new URL(value);
    return ['ws:', 'wss:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  }, 'tosu doit utiliser une adresse locale ws://.'),
  clientId: z.string().regex(/^\d*$/), clientSecret: z.string().max(1024).optional(),
  targetStars: z.number().min(0).max(20), preferredMods: z.enum(['NM', 'HD', 'HR', 'DT', 'HDDT', 'HDHR', 'HT', 'EZ']),
});

/** Migrate the original stable-only file without reinterpreting its paths as lazer. */
export function normalizeSettings(value: unknown): Settings {
  const input = z.record(z.string(), z.unknown()).parse(value);
  const legacy = !input.libraries && ('osuPath' in input || 'songsPath' in input);
  const supplied = z.object({
    stable: z.object({ osuPath: z.string().optional(), songsPath: z.string().optional() }).optional(),
    lazer: z.object({ osuPath: z.string().optional() }).optional(),
  }).parse(input.libraries ?? {});
  const combined = {
    ...defaults, ...input,
    client: input.client ?? (legacy ? 'stable' : 'lazer'),
    libraries: {
      stable: { ...defaults.libraries.stable, ...(legacy ? { osuPath: input.osuPath ?? '', songsPath: input.songsPath ?? '' } : supplied.stable) },
      lazer: { ...defaults.libraries.lazer, ...supplied.lazer },
    },
  };
  return settingsUpdateSchema.extend({ port: z.number().int().min(1).max(65535), clientSecret: z.string().max(1024) }).parse(combined);
}

export function selectedLibrary(settings: Settings): LibrarySelection {
  const profile = settings.libraries[settings.client];
  return { client: settings.client, osuPath: profile.osuPath, songsPath: settings.client === 'stable' ? settings.libraries.stable.songsPath : '' };
}
