import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

export function reserveExternalWindow() { return isTauri() ? null : window.open('about:blank', '_blank'); }
export async function openExternal(url: string, reserved?: Window | null) {
  if (!/^(https?:\/\/|osu:\/\/)/i.test(url)) throw new Error('Unsupported external link.');
  if (isTauri()) await openUrl(url);
  else if (reserved) { reserved.opener = null; reserved.location.href = url; }
  else { const opened = window.open('about:blank', '_blank'); if (!opened) throw new Error('Allow popups to open the link.'); opened.opener = null; opened.location.href = url; }
}
