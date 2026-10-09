import { AudioLines, Check, Clock3, Database, FolderHeart, Sparkles, Star } from "lucide-react";
import type { Beatmap } from "../../../shared/types";
import { formatTime } from "../../lib/format";
import { t } from "../../lib/i18n";
import { coverUrl, modes } from "./model";
import { starColor, textColor } from "./tools/difficulty-colors";
export function MapCard({
  maps,
  onSelect,
  allowFetch = false,
}: {
  maps: Beatmap[];
  onSelect: (m: Beatmap) => void;
  allowFetch?: boolean;
}) {
  const map = maps[0];
  const sortedMaps = [...maps].sort((a, b) => {
    if (a.stars === null) return b.stars === null ? 0 : 1;
    if (b.stars === null) return -1;
    return a.stars - b.stars;
  });
  const ratedMaps = sortedMaps.filter((m) => m.stars !== null);
  const lowestMap = ratedMaps[0];
  const highestMap = ratedMaps[ratedMaps.length - 1];
  const cover = coverUrl(map, allowFetch);
  return (
    <article
      className="map-card"
      style={
        {
          "--map-color": starColor(map.stars),
          "--map-text-color": textColor(map.stars),
        } as React.CSSProperties
      }
    >
      <button
        className={`card-image ${cover ? "" : "no-cover"}`}
        onClick={() => onSelect(map)}
        aria-label={t("Open {{title}}", { title: map.title })}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <AudioLines size={38} />
        )}
        <span className="card-gradient" />
        <span className={`ranked-badge ${map.status}`}>{map.status.toUpperCase()}</span>
        <span className="card-presence">
          {map.local ? (
            <>
              <Check size={11} />
              {t("Installed")}
            </>
          ) : (
            <>
              <Database size={11} />
              {t("Cached")}
            </>
          )}
        </span>
      </button>
      <button className="card-title" onClick={() => onSelect(map)}>
        <h3>{map.title}</h3>
        <p>{map.artist}</p>
      </button>
      <div className="mapper">
        {t("mapped by")} <span>{map.creator || t("unknown")}</span>
      </div>
      <div className="difficulty-row">
        <div className="difficulty-dots">
          {sortedMaps.slice(0, 12).map((m) => (
            <button
              key={m.key}
              style={{ background: starColor(m.stars) }}
              title={`${m.version} · ${m.stars?.toFixed(2) ?? "?"} ★`}
              onClick={() => onSelect(m)}
              aria-label={t("Difficulty {{p0}}", { p0: m.version })}
            />
          ))}
        </div>
        <span>{modes[map.mode]}</span>
        <span
          className="difficulty-rating"
          style={
            {
              "--map-color": starColor(lowestMap?.stars ?? null),
              "--map-text-color": textColor(lowestMap?.stars ?? null),
            } as React.CSSProperties
          }
        >
          <Star size={11} fill="currentColor" />
          {lowestMap?.stars?.toFixed(2) ?? "—"}
        </span>
        <span>-</span>
        <span
          className="difficulty-rating"
          style={
            {
              "--map-color": starColor(highestMap?.stars ?? null),
              "--map-text-color": textColor(highestMap?.stars ?? null),
            } as React.CSSProperties
          }
        >
          <Star size={11} fill="currentColor" />
          {highestMap?.stars?.toFixed(2) ?? "—"}
        </span>
      </div>
      <div className="card-meta">
        <span>
          <Clock3 size={12} />
          {formatTime(map.length)}
        </span>
        <span>{map.bpm ? Math.round(map.bpm) : "—"} BPM</span>
        {map.collections.length > 0 && (
          <span title={map.collections.join(", ")}>
            <FolderHeart size={12} />
            {map.collections.length}
          </span>
        )}
        <span className="card-played">{map.played ? t("Played") : t("To try")}</span>
      </div>
      {map.reason && (
        <div className="card-reason">
          <Sparkles size={13} />
          {map.reason}
        </div>
      )}
    </article>
  );
}
