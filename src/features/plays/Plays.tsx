import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronRight, LoaderCircle, Play as PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LiveState, Play } from "../../../shared/types";
import { api } from "../../lib/api";
import { display } from "../../lib/format";
import { locale, t } from "../../lib/i18n";
import { outcomes } from "../../lib/play-outcomes";
import { TosuDiagnostics } from "../telemetry/TosuDiagnostics";
import { Live } from "./Live";
import { SavedPlay } from "./components/SavedPlay";

type Mode = "auto" | "history" | "live";
function isActive(live: LiveState) {
  return (
    live.connected &&
    (live.capture?.active ||
      live.paused ||
      /^(play|playing|replay|watch|watching|spectating|2|8)$/i.test(live.state) ||
      /result|ranking/i.test(live.state) ||
      ["7", "14", "17", "18"].includes(live.state))
  );
}

export function Plays({ live, onSettings }: { live: LiveState; onSettings: () => void }) {
  const [mode, setMode] = useState<Mode>("auto"),
    [selectedId, setSelectedId] = useState<number | null>(null);
  const result = useQuery({
    queryKey: ["plays"],
    queryFn: () => api<Play[]>("/api/plays"),
    refetchInterval: 10000,
  });
  const active = !!isActive(live),
    view = mode === "auto" ? (active ? "live" : "history") : mode;
  const previousActive = useRef(active),
    runStartedAt = useRef(active ? Date.now() : 0),
    pendingSelection = useRef<number | null>(null);
  const selectedPanel = useRef<HTMLDivElement>(null),
    focusSelection = useRef(false);
  const focusPanel = () => {
    selectedPanel.current?.focus({ preventScroll: true });
    selectedPanel.current?.scrollIntoView({ block: "start", behavior: "auto" });
  };
  useEffect(() => {
    if (view === "history" && selectedId !== null && focusSelection.current) {
      focusSelection.current = false;
      focusPanel();
    }
  }, [selectedId, view]);
  useEffect(() => {
    if (active && !previousActive.current) {
      runStartedAt.current = Date.now();
      if (mode === "auto") setSelectedId(null);
    }
    if (!active && previousActive.current && mode === "auto")
      pendingSelection.current = runStartedAt.current;
    previousActive.current = active;
    if (mode !== "auto") pendingSelection.current = null;
    if (!active && pendingSelection.current !== null) {
      const latest = result.data?.find(
        (play) => Date.parse(play.endedAt) >= pendingSelection.current!,
      );
      if (latest) {
        setSelectedId(latest.id);
        pendingSelection.current = null;
      }
    }
  }, [active, mode, result.data]);
  const selected = result.data?.find((play) => play.id === selectedId);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span />
            {t("MAKE EVERY ATTEMPT COUNT")}
          </div>
          <h1>
            {t("Your plays")}
            <span>.</span>
          </h1>
          <p>{t("Live while you play, your attempts when you return to the menu.")}</p>
        </div>
      </div>
      <div className="plays-navigation">
        <div className="plays-mode" role="group" aria-label={t("Play display")}>
          {(
            [
              ["auto", t("Automatic")],
              ["history", t("History")],
              ["live", t("Live")],
            ] as const
          ).map(([value, label]) => (
            <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
              {label}
            </button>
          ))}
        </div>
        <span className="muted" role="status">
          {mode === "auto"
            ? active
              ? t("Gameplay is displayed automatically.")
              : t("History is displayed automatically.")
            : t("Manual display. Choose Automatic to follow the game.")}
        </span>
      </div>
      {view === "live" ? (
        <Live live={live} onSettings={onSettings} />
      ) : (
        <>
          {result.isError && (
            <div className="error-box" role="alert">
              {result.error.message}
              <button className="secondary-button" onClick={() => void result.refetch()}>
                {t("Try again")}
              </button>
            </div>
          )}
          {selected && (
            <div
              ref={selectedPanel}
              className="selected-play-panel"
              tabIndex={-1}
              role="group"
              aria-label={t("Recorded attempt")}
            >
              <SavedPlay
                key={selected.id}
                play={selected}
                onClose={() => {
                  pendingSelection.current = null;
                  setSelectedId(null);
                  document.getElementById(`stored-play-${selected.id}`)?.focus();
                }}
              />
            </div>
          )}
          <div className="section-title history-heading">
            <Activity size={18} />
            <h2>{t("History")}</h2>
            <span className="badge">{t("Latest 100 attempts")}</span>
          </div>
          {result.isPending ? (
            <p role="status" className="catalog-loading">
              <LoaderCircle size={18} className="spin" />
              {t("Loading attempts…")}
            </p>
          ) : result.data?.length ? (
            <div className="plays-list">
              {result.data.map((play) => (
                <button
                  id={`stored-play-${play.id}`}
                  key={play.id}
                  className={`play-row ${selected?.id === play.id ? "selected" : ""}`}
                  aria-pressed={selected?.id === play.id}
                  onClick={() => {
                    pendingSelection.current = null;
                    focusSelection.current = true;
                    if (selectedId === play.id) {
                      focusSelection.current = false;
                      focusPanel();
                    } else setSelectedId(play.id);
                  }}
                >
                  <div className="play-icon">
                    <PlayIcon size={17} />
                  </div>
                  <div className="play-description">
                    <strong>{play.title}</strong>
                    <span>
                      {play.version} · {play.mods}
                      {play.partial ? t(" · Partial capture") : ""}
                      {play.sourceConfirmed === false ? t(" · Unconfirmed mode") : ""} ·{" "}
                      {new Date(play.startedAt).toLocaleString(locale())}
                    </span>
                  </div>
                  <span className={`outcome ${play.outcome}`}>
                    {t(outcomes[play.outcome] || play.outcome)}
                  </span>
                  <div className="play-value">
                    <strong>{display(play.accuracy, 2)} %</strong>
                    <span>{t("accuracy")}</span>
                  </div>
                  <div className="play-value">
                    <strong>{display(play.misses)}</strong>
                    <span>{t("misses")}</span>
                  </div>
                  <div className="play-value">
                    <strong>{display(play.pp)}</strong>
                    <span>{t("observed pp")}</span>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            !result.isError && (
              <div className="empty-panel large">
                <Activity size={37} />
                <h2>{t("Every attempt has a story to tell.")}</h2>
                <p>
                  {t(
                    "Start tosu and play a map. Observed results, fails and retries will appear here.",
                  )}
                </p>
                <span className="badge">
                  {t("Replays remain visible live without creating an attempt")}
                </span>
              </div>
            )
          )}
        </>
      )}
      <TosuDiagnostics />
    </>
  );
}
