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
            {t("Une sélection pour toi")}
            <span>.</span>
          </h1>
          <p>{t("Cinq maps, une difficulté cible, de nouvelles possibilités.")}</p>
        </div>
        <Sparkles className="heading-icon" size={42} />
      </div>
      <div className="recommend-panel">
        <div className="section-title">
          <Target size={18} />
          <h2>{t("Préparer ta sélection")}</h2>
          <span className="badge">{t("Moteur initial")}</span>
        </div>
        <div className="recommendation-search">
          <label>
            {t("Recherche et métadonnées")}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Artiste, titre, tags, mapper…")}
            />
          </label>
          <MetadataFilters query={query} onChange={setQuery} />
        </div>
        <div className="form-grid">
          <label>
            {t("Objectif")}
            <select value={objective} onChange={(e) => setObjective(e.target.value)}>
              <option value="farm">{t("Farm")}</option>
              <option value="improve">{t("Rejouer et améliorer")}</option>
              <option value="discovery">{t("Découverte")}</option>
              <option value="training">{t("Entraînement")}</option>
            </select>
          </label>
          <label>
            {t("Source")}
            <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
              <option value="local">{t("Installées uniquement")}</option>
              <option value="cached">{t("Catalogue en cache")}</option>
              <option value="new">{t("Non installées + découverte")}</option>
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
            {t("Difficulté cible")}{" "}
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
              "La sélection actuelle utilise les étoiles NM, l’historique connu et la diversité des sets. La modélisation du profil et des gains de PP est prévue ensuite.",
            )}
          </p>
          <button className="primary-button" onClick={() => void suggest()} disabled={busy}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
            {t("Recommander 5 maps")}
          </button>
        </div>
      </div>
      {result ? (
        <>
          <div className="results-toolbar">
            <div>
              <strong>{result.maps.length}</strong> {t("suggestions")}{" "}
              <span className="muted">{t("· cinq sets maximum")}</span>
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
              <h2>{t("Pas assez de difficultés connues.")}</h2>
              <p>
                {t(
                  "Indexe la bibliothèque ou élargis la difficulté cible. Ouvrir une map puis calculer son analyse renseigne ses étoiles si elles sont absentes.",
                )}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="recommend-intro">
          <div>
            <span>01</span>
            <h3>{t("Une cible claire")}</h3>
            <p>{t("Les contraintes réduisent le catalogue aux maps pertinentes.")}</p>
          </div>
          <div>
            <span>02</span>
            <h3>{t("Un peu de variété")}</h3>
            <p>{t("Un seul résultat par set pour explorer plusieurs morceaux.")}</p>
          </div>
          <div>
            <span>03</span>
            <h3>{t("Une raison visible")}</h3>
            <p>{t("Chaque proposition indique les critères de sa sélection.")}</p>
          </div>
        </div>
      )}
    </>
  );
}
