import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Beatmap, Collection, Status } from "../shared/types";
import type { Page } from "./app/navigation";
import { getNavigationItems } from "./app/navigation";
import { Footer } from "./components/layout/Footer";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Toast } from "./components/Toast";
import { Library } from "./features/library/Library";
import { MapDetail } from "./features/library/MapDetail";
import { Plays } from "./features/plays/Plays";
import { Recommendations } from "./features/recommendations/Recommendations";
import { ReleaseNotes } from "./features/releases/ReleaseNotes";
import { Settings } from "./features/settings/Settings";
import { useDesktopLinks } from "./hooks/useDesktopLinks";
import { useLive } from "./hooks/useLive";
import { useResponsiveNavigation } from "./hooks/useResponsiveNavigation";
import { api } from "./lib/api";
import { t } from "./lib/i18n";
export default function App() {
  useTranslation();
  const [page, setPage] = useState<Page>("library");
  const [selected, setSelected] = useState<Beatmap | null>(null);
  const [toast, setToast] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const live = useLive();
  const client = useQueryClient();
  const status = useQuery({
    queryKey: ["status"],
    queryFn: () => api<Status>("/api/status"),
    refetchInterval: 4000,
  });
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: () => api<Collection[]>("/api/collections"),
  });
  const [collection, setCollection] = useState("");
  const [indexBusy, setIndexBusy] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  const index = async () => {
    setIndexBusy(true);
    try {
      await api("/api/index", {});
      await client.invalidateQueries({ queryKey: ["status"] });
    } catch (e) {
      setToast(t((e as Error).message));
    } finally {
      setIndexBusy(false);
    }
  };
  const { compact, navigationOpen, setNavigationOpen, menuTrigger, navigation, closeNavigation } =
    useResponsiveNavigation(page);
  useDesktopLinks(setToast);
  const nav = getNavigationItems(status.data?.installed ?? 0);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("Aller au contenu")}
      </a>
      {compact && navigationOpen && (
        <button
          className="navigation-backdrop"
          aria-label={t("Fermer la navigation")}
          tabIndex={-1}
          onClick={closeNavigation}
        />
      )}
      <Sidebar
        compact={compact}
        navigationOpen={navigationOpen}
        navigation={navigation}
        closeNavigation={closeNavigation}
        page={page}
        setPage={setPage}
        collection={collection}
        setCollection={setCollection}
        collections={collections.data || []}
        live={live}
        nav={nav}
        onNotes={() => setNotesOpen(true)}
      />
      <div className="main-shell" inert={compact && navigationOpen ? true : undefined}>
        <Topbar
          menuTrigger={menuTrigger}
          navigationOpen={navigationOpen}
          onNavigation={() => setNavigationOpen(true)}
          page={page}
          nav={nav}
          live={live}
          onSettings={() => setPage("settings")}
          notify={setToast}
        />
        <main id="main-content" tabIndex={-1}>
          {status.isError && (
            <div className="error-box">
              {t("Service local indisponible :")} {status.error.message}
            </div>
          )}
          {page === "library" && (
            <Library
              status={status.data}
              collections={collections.data || []}
              collection={collection}
              setCollection={setCollection}
              onSelect={setSelected}
              onIndex={index}
              onSettings={() => setPage("settings")}
              busy={indexBusy}
              notify={setToast}
            />
          )}
          {page === "recommend" && <Recommendations onSelect={setSelected} notify={setToast} />}
          {page === "plays" && <Plays live={live} onSettings={() => setPage("settings")} />}
          {page === "settings" && (
            <Settings
              notify={setToast}
              onIndex={index}
              onSaved={() => {
                setSelected(null);
                setCollection("");
              }}
            />
          )}
        </main>
        <Footer status={status.data} />
      </div>
      {selected && (
        <MapDetail
          key={selected.key}
          map={selected}
          onClose={() => setSelected(null)}
          onSelect={setSelected}
        />
      )}
      {notesOpen && <ReleaseNotes onClose={() => setNotesOpen(false)} />}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
