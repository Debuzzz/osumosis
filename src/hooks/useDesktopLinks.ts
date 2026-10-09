import { isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { openExternal } from "../lib/desktop";
import { t } from "../lib/i18n";

export function useDesktopLinks(setToast: (message: string) => void) {
  useEffect(() => {
    if (!isTauri()) return;
    const external = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (
        anchor &&
        /^(https?:|osu:)/.test(anchor.href) &&
        new URL(anchor.href).origin !== location.origin
      ) {
        event.preventDefault();
        void openExternal(anchor.href).catch((error) => setToast(t(error.message)));
      }
    };
    document.addEventListener("click", external);
    return () => document.removeEventListener("click", external);
  }, [setToast]);
}
