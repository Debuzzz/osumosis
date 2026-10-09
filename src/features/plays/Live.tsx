import { Check, Radio } from "lucide-react";
import type { LiveState } from "../../../shared/types";
import { locale, t } from "../../lib/i18n";
import { Performance } from "./components/Performance";
import { PlayTimeline } from "./components/PlayTimeline";

export function Live({ live, onSettings }: { live: LiveState; onSettings: () => void }) {
  const capture = live.capture;
  const labels: Record<string, string> = {
    play: t("Playing"),
    playing: t("Playing"),
    resultScreen: t("Result"),
    selectPlay: t("Map selection"),
  };
  const state =
    capture?.mode === "replay"
      ? t("Replay playback")
      : live.paused
        ? t("Paused")
        : labels[live.state] || live.state;
  return (
    <section className="live-view" aria-label={t("Live")}>
      <div className="performance-heading">
        <h2>{t("In the groove")}</h2>
        <span className={`status-pill ${live.connected ? "connected" : ""}`}>
          <Radio size={14} />
          {live.connected ? state : t("Waiting for tosu")}
        </span>
      </div>
      {!live.connected ? (
        <div className="empty-panel large">
          <Radio size={38} />
          <h2>{t("Ready when you are.")}</h2>
          <p>
            {t(
              "Start osu! and tosu. The local connection retries automatically every five seconds.",
            )}
          </p>
          <button className="secondary-button" onClick={onSettings}>
            {t("Check the tosu address")}
          </button>
        </div>
      ) : (
        <>
          <PlayTimeline
            points={live.history || []}
            events={live.events || []}
            errorsAvailable={capture?.mode !== "replay"}
          />
          <Performance
            map={live.map}
            play={live.play}
            client={live.client}
            ppScenarios={live.ppScenarios}
          />
          <div className="live-capture-status" role="status">
            <Check size={16} />
            <div>
              <strong>{capture?.reason ? t(capture.reason) : t("Waiting for telemetry.")}</strong>
              <span>
                {capture?.partial ? t("Capture started during gameplay. ") : ""}
                {capture?.mode === "unknown" ? t("Play/replay mode not confirmed by tosu. ") : ""}
                {capture?.lastSavedAt
                  ? t("Last saved at {{p0}}.", {
                      p0: new Date(capture.lastSavedAt).toLocaleTimeString(locale()),
                    })
                  : t("Played attempts are saved locally when they end.")}
              </span>
            </div>
          </div>
          {capture?.error && (
            <div className="error-box" role="alert">
              {capture.error}
            </div>
          )}
        </>
      )}
    </section>
  );
}
