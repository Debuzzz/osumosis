import { ChevronRight, Menu, Wifi, WifiOff } from "lucide-react";
import type { LiveState } from "../../../shared/types";
import type { NavigationItem, Page } from "../../app/navigation";
import { Account } from "../../features/account/Account";
import { t } from "../../lib/i18n";
export function Topbar({
  menuTrigger,
  navigationOpen,
  onNavigation,
  page,
  nav,
  live,
  onSettings,
  notify,
}: {
  menuTrigger: React.RefObject<HTMLButtonElement | null>;
  navigationOpen: boolean;
  onNavigation: () => void;
  page: Page;
  nav: NavigationItem[];
  live: LiveState;
  onSettings: () => void;
  notify: (message: string) => void;
}) {
  return (
    <header className="topbar">
      <button
        ref={menuTrigger}
        className="mobile-menu icon-button"
        aria-label={t("Ouvrir la navigation")}
        aria-expanded={navigationOpen}
        aria-controls="main-navigation"
        onClick={onNavigation}
      >
        <Menu size={20} />
      </button>
      <div className="breadcrumb">
        {t("TON ESPACE")} <ChevronRight size={13} />
        <span>{page === "settings" ? t("Réglages") : nav.find((n) => n.id === page)?.title}</span>
      </div>
      <div className="topbar-actions">
        <span className={`status-pill ${live.connected ? "connected" : ""}`}>
          {live.connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {live.connected ? t("tosu connecté") : t("tosu hors ligne")}
        </span>
        <Account onSettings={onSettings} notify={(message) => notify(t(message))} />
      </div>
    </header>
  );
}
