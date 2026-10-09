import { Target } from "lucide-react";
import type { LiveState } from "../../../../shared/types";
import { display, timeLabel } from "../../../lib/format";
import { t } from "../../../lib/i18n";
import { Background } from "./Background";

export type PerformanceMap = Pick<
  NonNullable<LiveState["map"]>,
  "checksum" | "title" | "artist" | "version"
> &
  Partial<NonNullable<LiveState["map"]>>;

/** Both the live feed and stored attempts render the same score widgets. */
export function Performance({
  map,
  play,
  client,
  ppScenarios,
  recorded = false,
}: {
  map: PerformanceMap | null;
  play: Partial<NonNullable<LiveState["play"]>> | null;
  client: string;
  ppScenarios?: LiveState["ppScenarios"];
  recorded?: boolean;
}) {
  const first = map?.firstObject || 0,
    end = map?.duration;
  const progress =
    end !== undefined && end > first
      ? Math.min(100, Math.max(0, (((map?.time || 0) - first) / (end - first)) * 100))
      : undefined;
  return (
    <div className="performance-summary">
      <section className="live-stage" aria-label={t("Résumé du score")}>
        {map?.checksum && (
          <Background key={map.checksum} checksum={map.checksum} live={!recorded} />
        )}
        <div className="live-stage-shade" />
        <div className="live-stage-content">
          <div className="live-track">
            <div className="eyebrow">
              {client.toUpperCase()} · {play?.mods || "NM"} ·{" "}
              {recorded ? t("Tentative enregistrée") : t("En direct")}
            </div>
            <h2>{map?.title || t("Sélectionne une map dans le jeu")}</h2>
            <p>
              {map?.artist || t("Ta prochaine map t’attend")}
              {map?.version ? ` · ${map.version}` : ""}
            </p>
            {map?.mapper && (
              <small>
                {t("mapped by")} {map.mapper}
              </small>
            )}
            <div className="live-map-stats">
              <span className="live-star">★ {display(map?.stars, 2)}</span>
              {[
                ["BPM", map?.bpm],
                ["AR", map?.ar],
                ["OD", map?.od],
                ["CS", map?.cs],
                ["HP", map?.hp],
              ].map(([label, value]) => (
                <span key={String(label)}>
                  {label}
                  <strong>{display(value as number | undefined, label === "BPM" ? 0 : 1)}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className="live-pp-focus">
            <span className="live-grade">{play?.rank || "—"}</span>
            <div>
              <strong>{display(play?.pp)}</strong>
              <span>pp</span>
            </div>
            <small>{t("observés par tosu")}</small>
            <div className="live-pp-target">
              <Target size={13} />
              {display(play?.fcPp)} {t("pp si FC")}
            </div>
          </div>
        </div>
        {progress !== undefined && (
          <>
            <div
              className="live-stage-progress"
              role="progressbar"
              aria-label={t("Progression de la map")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="live-stage-times">
              <span>{timeLabel(Math.max(0, (map?.time || 0) - first))}</span>
              <span>{timeLabel(Math.max(0, end! - first))}</span>
            </div>
          </>
        )}
      </section>
      <section className="live-score-strip" aria-label={t("Compteurs de performance")}>
        <div className="live-accuracy">
          <span>{t("Accuracy")}</span>
          <strong>
            {display(play?.accuracy, 2)}
            <small> %</small>
          </strong>
        </div>
        <div>
          <span>{t("Combo")}</span>
          <strong>
            {display(recorded ? play?.maxCombo : play?.combo)}
            <small>×</small>
          </strong>
          <small>
            {t("max")} {display(play?.maxCombo)} / {display(map?.maxCombo)}
          </small>
        </div>
        <div className="hit-great">
          <span>300</span>
          <strong>{display(play?.hits?.["300"])}</strong>
        </div>
        <div className="hit-good">
          <span>100</span>
          <strong>{display(play?.hits?.["100"])}</strong>
        </div>
        <div className="hit-meh">
          <span>50</span>
          <strong>{display(play?.hits?.["50"])}</strong>
        </div>
        <div className="hit-miss">
          <span>{t("Miss")}</span>
          <strong>{display(play?.misses)}</strong>
        </div>
        <div>
          <span>{t("Sliderbreaks")}</span>
          <strong>{display(play?.sliderBreaks)}</strong>
        </div>
      </section>
      <section className="live-panel performance-reference" aria-label={t("Repères")}>
        <div className="live-secondary-stats">
          <div>
            <span>{t("Unstable rate")}</span>
            <strong>{display(play?.ur, 1)}</strong>
          </div>
          <div>
            <span>{t("Score")}</span>
            <strong>{display(play?.score)}</strong>
          </div>
        </div>
        {ppScenarios?.length ? (
          <div>
            <h3>{t("Scénarios de PP transmis par tosu")}</h3>
            <div className="live-scenarios">
              {ppScenarios.map((scenario) => (
                <div key={scenario.accuracy}>
                  <span>{display(scenario.accuracy)} %</span>
                  <strong>
                    {display(scenario.pp)}
                    <small> pp</small>
                  </strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted">
            {recorded
              ? t("Scénarios non conservés pour cette tentative.")
              : t("Les estimations apparaîtront quand tosu aura chargé la map.")}
          </p>
        )}
      </section>
    </div>
  );
}
