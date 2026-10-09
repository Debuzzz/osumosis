import { useQuery } from "@tanstack/react-query";
import { Database, Download, ExternalLink, FolderHeart, Play as PlayIcon, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Beatmap, Play } from "../../../shared/types";
import { api } from "../../lib/api";
import { formatTime } from "../../lib/format";
import { t } from "../../lib/i18n";
import { outcomes } from "../../lib/play-outcomes";
import { MapAnalysis } from "./components/MapAnalysis";
import { coverUrl } from "./model";
import { starColor } from "./tools/difficulty-colors";
export function MapDetail({
  map,
  onClose,
  onSelect,
}: {
  map: Beatmap;
  onClose: () => void;
  onSelect: (m: Beatmap) => void;
}) {
  const detail = useQuery({
    queryKey: ["detail", map.key],
    queryFn: () =>
      api<{ map: Beatmap; difficulties: Beatmap[]; plays: Play[]; preview: number }>(
        "/api/maps/" + encodeURIComponent(map.key),
      ),
  });
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = drawer.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const audio = useRef<HTMLAudioElement>(null);
  const m = detail.data?.map || map;
  const cover = coverUrl(m, true);
  return (
    <dialog
      ref={drawer}
      className="drawer-backdrop drawer-dialog"
      aria-label={t("Détails de {{title}}", { title: m.title })}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={onClose}
    >
      <aside className="map-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close icon-button" onClick={onClose} aria-label={t("Fermer")}>
          <X size={20} />
        </button>
        <div className="drawer-cover">
          {cover && <img src={cover} alt="" />}
          <div />
          <span className={`ranked-badge ${m.status}`}>{m.status.toUpperCase()}</span>
          <h2>{m.title}</h2>
          <p>{m.artist}</p>
        </div>
        <div className="drawer-content">
          <div className="drawer-byline">
            {t("mapped by")} <strong>{m.creator}</strong>
            <span>{m.local ? t("Installée") : t("Métadonnées en cache")}</span>
          </div>
          <div className="drawer-actions">
            {m.beatmapId && (
              <a className="primary-button small" href={`osu://b/${m.beatmapId}`}>
                <PlayIcon size={14} />
                {t("Ouvrir dans osu!")}
              </a>
            )}
            {m.setId && (
              <a
                className="secondary-button small"
                href={`https://osu.ppy.sh/beatmapsets/${m.setId}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} />
                {t("Page officielle")}
              </a>
            )}
            {!m.local && m.setId && (
              <a
                className="secondary-button small"
                href={`https://osu.ppy.sh/beatmapsets/${m.setId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={14} />
                {t("Télécharger sur osu!")}
              </a>
            )}
          </div>
          <div className="drawer-section">
            <h3>{t("Difficultés du set")}</h3>
            <div className="difficulty-buttons">
              {(detail.data?.difficulties || [m]).map((d) => (
                <button
                  key={d.key}
                  className={d.key === m.key ? "active" : ""}
                  onClick={() => onSelect(d)}
                >
                  <i style={{ background: starColor(d.stars) }} />
                  <span>{d.version}</span>
                  <strong>{d.stars?.toFixed(2) || "?"}</strong>
                  {!d.local && <Database size={12} />}
                </button>
              ))}
            </div>
          </div>
          <div className="map-facts">
            {[
              [t("Étoiles NM"), m.stars?.toFixed(2) || "—"],
              ["BPM", m.bpm?.toFixed(0) || "—"],
              [t("Durée indicative"), formatTime(m.length)],
              [t("Objets"), String(m.objects)],
              ["AR", String(m.ar)],
              ["OD", String(m.od)],
              ["CS", String(m.cs)],
              ["HP", String(m.hp)],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {m.local && (
            <div className="drawer-section">
              <h3>{t("Audio local")}</h3>
              <audio
                ref={audio}
                controls
                preload="none"
                src={`/api/assets/${encodeURIComponent(m.key)}/audio`}
                onLoadedMetadata={() => {
                  if (audio.current && detail.data && detail.data.preview > 0)
                    audio.current.currentTime = detail.data.preview / 1000;
                }}
              />
            </div>
          )}
          {m.collections.length > 0 && (
            <div className="drawer-section">
              <h3>{t("Collections")}</h3>
              <div className="chips">
                {m.collections.map((c) => (
                  <span className="tag" key={c}>
                    <FolderHeart size={12} />
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          <MapAnalysis key={m.key} map={m} />
          <div className="drawer-section map-metadata">
            <h3>{t("Métadonnées")}</h3>
            <dl>
              <dt>{t("Source du morceau")}</dt>
              <dd>{m.source || "—"}</dd>
              <dt>{t("Tags de la map")}</dt>
              <dd>{m.tags || "—"}</dd>
            </dl>
          </div>
          <div className="drawer-section">
            <h3>
              {t("Tentatives observées")}{" "}
              <span className="muted">({detail.data?.plays.length || 0})</span>
            </h3>
            {detail.data?.plays.length ? (
              detail.data.plays.map((p) => (
                <div className="mini-play" key={p.id}>
                  <span>{t(outcomes[p.outcome])}</span>
                  <strong>{p.accuracy.toFixed(2)} %</strong>
                  <span>
                    {p.misses} {t("misses")}
                  </span>
                  <span>{p.mods}</span>
                </div>
              ))
            ) : (
              <p className="muted">
                {t("Aucune tentative enregistrée pour cette version de la map.")}
              </p>
            )}
          </div>
          <div className="checksum">
            <Database size={12} />
            {m.checksum}
          </div>
        </div>
      </aside>
    </dialog>
  );
}
