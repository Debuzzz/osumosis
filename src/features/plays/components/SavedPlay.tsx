import { X } from "lucide-react";
import { useMemo } from "react";
import type { Play } from "../../../../shared/types";
import { locale, t } from "../../../lib/i18n";
import { outcomes } from "../../../lib/play-outcomes";
import { Performance, type PerformanceMap } from "./Performance";
import { PlayTimeline } from "./PlayTimeline";
export function SavedPlay({ play, onClose }: { play: Play; onClose: () => void }) {
  const snapshot = play.snapshot;
  const map: PerformanceMap = snapshot?.map || {
    checksum: play.checksum,
    title: play.title,
    artist: play.artist,
    version: play.version,
  };
  const score = {
    ...snapshot?.play,
    accuracy: play.accuracy,
    maxCombo: play.combo,
    misses: play.misses,
    sliderBreaks: play.sliderBreaks,
    pp: play.pp,
    ur: play.ur,
    mods: play.mods,
  };
  const points = useMemo(
    () => [
      ...play.events.map((event) => ({
        time: event.time,
        accuracy: event.accuracy,
        pp: event.pp,
        fcPp: event.fcPp,
      })),
      { time: play.duration, accuracy: play.accuracy, pp: play.pp, fcPp: snapshot?.play.fcPp },
    ],
    [play, snapshot],
  );
  return (
    <section className="saved-play" aria-label={t("Tentative enregistrée")}>
      <div className="performance-heading">
        <div>
          <h2>{play.title}</h2>
          <p className="muted">
            {new Date(play.startedAt).toLocaleString(locale())} ·{" "}
            {t(outcomes[play.outcome] || play.outcome)}
            {play.partial ? t(" · Capture partielle") : ""}
            {play.sourceConfirmed === false ? t(" · Mode non confirmé") : ""}
          </p>
        </div>
        <button className="icon-button" aria-label={t("Fermer l’analyse")} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <PlayTimeline points={points} events={play.events} />
      <Performance
        map={map}
        play={score}
        client={play.client}
        ppScenarios={snapshot?.ppScenarios}
        recorded
      />
      {!snapshot && (
        <p className="notice">
          {t(
            "Ancienne capture : les jugements, le rang, le score total et les statistiques de map n’ont pas été conservés. Les champs absents restent vides.",
          )}
        </p>
      )}
      <p className="fine-print">
        {t("Affichage de la télémétrie sauvegardée, sans lecture des frames du replay.")}
      </p>
    </section>
  );
}
