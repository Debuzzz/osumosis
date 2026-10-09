import { Database, FolderHeart, Settings2, X } from "lucide-react";
import { version } from "../../../package.json";
import type { Collection, LiveState } from "../../../shared/types";
import type { NavigationItem, Page } from "../../app/navigation";
import { t } from "../../lib/i18n";
export function Sidebar({
  compact,
  navigationOpen,
  navigation,
  closeNavigation,
  page,
  setPage,
  collection,
  setCollection,
  collections,
  live,
  nav,
  onNotes,
}: {
  compact: boolean;
  navigationOpen: boolean;
  navigation: React.RefObject<HTMLElement | null>;
  closeNavigation: () => void;
  page: Page;
  setPage: (page: Page) => void;
  collection: string;
  setCollection: (value: string) => void;
  collections: Collection[];
  live: LiveState;
  nav: NavigationItem[];
  onNotes: () => void;
}) {
  return (
    <aside
      id="main-navigation"
      ref={navigation}
      className={`sidebar ${navigationOpen ? "navigation-open" : ""}`}
      inert={compact && !navigationOpen ? true : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeNavigation();
        if (compact && navigationOpen && event.key === "Tab") {
          const buttons = navigation.current!.querySelectorAll<HTMLButtonElement>("button");
          const first = buttons[0],
            last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <button
        className="mobile-nav-close icon-button"
        aria-label={t("Fermer la navigation")}
        onClick={closeNavigation}
      >
        <X size={20} />
      </button>
      <button
        className="brand"
        onClick={() => {
          if (compact) closeNavigation();
          setPage("library");
        }}
      >
        <span className="brand-orbit">
          <i />
        </span>
        <span>
          osu!<b>{t("mosis")}</b>
          <small>{t("YOUR NEXT GOOD PLAY")}</small>
        </span>
      </button>
      <div className="workspace-label">
        {t("ESPACE LOCAL")} <span>01</span>
      </div>
      <nav aria-label={t("Navigation principale")}>
        {nav.map((item) => (
          <button
            key={item.id}
            aria-current={page === item.id ? "page" : undefined}
            className={`nav-item ${page === item.id ? "active" : ""}`}
            onClick={() => {
              if (compact) closeNavigation();
              setPage(item.id);
              if (item.id === "library") setCollection("");
            }}
          >
            <item.icon size={18} />
            <span>{item.title}</span>
            {item.detail && <em>{item.detail}</em>}
            {item.id === "plays" && (
              <i className={`connection-dot ${live.connected ? "on" : ""}`} />
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-section">
        <span>{t("COLLECTIONS")}</span>
        <FolderHeart size={14} />
      </div>
      <div className="collection-nav">
        {collections?.length ? (
          collections.slice(0, 15).map((c) => (
            <button
              key={c.id}
              className={collection === String(c.id) && page === "library" ? "selected" : ""}
              onClick={() => {
                if (compact) closeNavigation();
                setCollection(String(c.id));
                setPage("library");
              }}
            >
              <span className="collection-dot" />
              <span>{c.name}</span>
              <em>{c.installed}</em>
            </button>
          ))
        ) : (
          <p>{t("Les collections du jeu apparaîtront après l’indexation.")}</p>
        )}
      </div>
      <div className="sidebar-bottom">
        <div className="local-note">
          <Database size={16} />
          <span>
            {t("Ton catalogue, chez toi.")}
            <small>{t("SQLite · cache local")}</small>
          </span>
        </div>
        <button
          aria-current={page === "settings" ? "page" : undefined}
          className={`nav-item ${page === "settings" ? "active" : ""}`}
          onClick={() => {
            if (compact) closeNavigation();
            setPage("settings");
          }}
        >
          <Settings2 size={18} />
          <span>{t("Réglages")}</span>
        </button>
        <button className="version release-trigger" onClick={() => onNotes()}>
          osu!mosis <span>{t("v{{version}} · Notes de version", { version })}</span>
        </button>
      </div>
    </aside>
  );
}
