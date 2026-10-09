import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Sparkles, Star, Target } from "lucide-react";
import { useEffect, useState } from "react";
import type { Beatmap, SettingsResponse, Source } from "../../../shared/types";
import { api } from "../../lib/api";
import { t } from "../../lib/i18n";
import { MetadataFilters } from "../library/components/MetadataFilters";
import { MapCard } from "../library/MapCard";
import { modes } from "../library/model";
export function Recommendations({
  onSelect,
  notify,
}: {
  onSelect: (m: Beatmap) => void;
  notify: (s: string) => void;
}) {
  const [source, setSource] = useState<Source>("local"),
    [target, setTarget] = useState(5.5),
    [mode, setMode] = useState("0"),
    [objective, setObjective] = useState("farm"),
    [query, setQuery] = useState("");
  const preferences = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<SettingsResponse>("/api/settings"),
  });
  useEffect(() => {
    if (preferences.data) setTarget(preferences.data.settings.targetStars);
  }, [preferences.data]);
  const [result, setResult] = useState<{ maps: Beatmap[]; note: string } | null>(null),
    [busy, setBusy] = useState(false);
  const suggest = async () => {
    setBusy(true);
    try {
      if (source === "new")
        await api("/api/discover", {
          q: `${query} stars>=${Math.max(0, target - 1)} stars<=${target + 1}`.trim(),
          mode,
          status: "ranked",
        });
      setResult(await api("/api/recommend", { source, target, mode, objective, q: query }));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> {t("A LITTLE DIRECTION")}
          </div>
          <h1>
            {t("A selection for you")}
            <span>.</span>
          </h1>
          <p>{t("Five maps, a target difficulty, new possibilities.")}</p>
        </div>
        <Sparkles className="heading-icon" size={42} />
      </div>
      <div className="recommend-panel">
        <div className="section-title">
          <Target size={18} />
          <h2>{t("Prepare your selection")}</h2>
          <span className="badge">{t("Initial engine")}</span>
        </div>
        <div className="recommendation-search">
          <label>
            {t("Search and metadata")}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Artist, title, tags, mapper…")}
            />
          </label>
          <MetadataFilters query={query} onChange={setQuery} />
        </div>
        <div className="form-grid">
          <label>
            {t("Objective")}
            <select value={objective} onChange={(e) => setObjective(e.target.value)}>
              <option value="farm">{t("Farm")}</option>
              <option value="improve">{t("Replay and improve")}</option>
              <option value="discovery">{t("Discovery")}</option>
              <option value="training">{t("Training")}</option>
            </select>
          </label>
          <label>
            {t("Source")}
            <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
              <option value="local">{t("Installed only")}</option>
              <option value="cached">{t("Cached catalog")}</option>
              <option value="new">{t("Not installed + discovery")}</option>
            </select>
          </label>
          <label>
            {t("Mode")}
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {modes.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="target-slider">
          <label>
            {t("Target difficulty")}{" "}
            <strong>
              {target.toFixed(1)} <Star size={14} fill="currentColor" />
            </strong>
          </label>
          <input
            type="range"
            min="1"
            max="12"
            step="0.1"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
          <div>
            <span>1 ★</span>
            <span>12 ★</span>
          </div>
        </div>
        <div className="recommend-bottom">
          <p>
            {t(
              "The current selection uses NM stars, known history and set diversity. Player profiles and PP gains are planned next.",
            )}
          </p>
          <button className="primary-button" onClick={() => void suggest()} disabled={busy}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
            {t("Recommend 5 maps")}
          </button>
        </div>
      </div>
      {result ? (
        <>
          <div className="results-toolbar">
            <div>
              <strong>{result.maps.length}</strong> {t("suggestions")}{" "}
              <span className="muted">{t("· up to five sets")}</span>
            </div>
          </div>
          {result.maps.length ? (
            <div className="map-grid">
              {result.maps.map((m) => (
                <MapCard key={m.key} maps={[m]} onSelect={onSelect} />
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <Target size={30} />
              <h2>{t("Not enough known difficulties.")}</h2>
              <p>
                {t(
                  "Index your library or widen the target difficulty. Opening a map and calculating its analysis fills in missing star ratings.",
                )}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="recommend-intro">
          <div>
            <span>01</span>
            <h3>{t("A clear target")}</h3>
            <p>{t("Filters narrow the catalog down to relevant maps.")}</p>
          </div>
          <div>
            <span>02</span>
            <h3>{t("A little variety")}</h3>
            <p>{t("One result per set to explore different songs.")}</p>
          </div>
          <div>
            <span>03</span>
            <h3>{t("A visible reason")}</h3>
            <p>{t("Each suggestion explains why it was selected.")}</p>
          </div>
        </div>
      )}
    </>
  );
}
