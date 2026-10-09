import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, LoaderCircle, Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { Analysis, Beatmap, SettingsResponse } from "../../../../shared/types";
import { Chart } from "../../../components/Chart";
import { api } from "../../../lib/api";
import { t } from "../../../lib/i18n";

export function MapAnalysis({ map }: { map: Beatmap }) {
  const [mods, setMods] = useState("NM"),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const preferences = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<SettingsResponse>("/api/settings"),
  });
  useEffect(() => {
    if (preferences.data) setMods(preferences.data.settings.preferredMods);
  }, [preferences.data]);
  const client = useQueryClient();
  const m = map;
  useEffect(() => {
    setAnalysis(null);
    setError("");
  }, [map.key]);

  useEffect(() => {
    setAnalysis(null);
  }, [mods, preferences.data?.settings.client]);
  const calculate = async () => {
    setBusy(true);
    setError("");
    try {
      setAnalysis(await api<Analysis>(`/api/maps/${encodeURIComponent(m.key)}/analysis`, { mods }));
      await client.invalidateQueries({ queryKey: ["maps"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="drawer-section">
      <div className="section-title">
        <Activity size={17} />
        <h3>{t("Difficulté & simulation de PP")}</h3>
      </div>
      <div className="analysis-controls">
        <select
          aria-label={t("Mods du calcul")}
          value={mods}
          onChange={(e) => setMods(e.target.value)}
        >
          {["NM", "HD", "HR", "DT", "HDDT", "HDHR", "HT", "EZ"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <button
          className="primary-button small"
          disabled={!m.local || busy}
          onClick={() => void calculate()}
        >
          {busy ? <LoaderCircle className="spin" size={14} /> : <Activity size={14} />}
          {t("Calculer localement")}
        </button>
      </div>
      {!m.local && (
        <p className="muted">
          {t(
            "Le fichier .osu est nécessaire pour ce calcul. Les métadonnées seules restent disponibles.",
          )}
        </p>
      )}
      {error && <div className="error-box">{error}</div>}
      {analysis && (
        <>
          <div className="analysis-summary">
            <span>
              <Star size={14} fill="currentColor" />
              {analysis.stars.toFixed(2)} {t("★ avec")} {mods}
            </span>
            <span>
              {analysis.maxCombo}
              {t("× max")}
            </span>
          </div>
          <Chart
            label={t("Strain de difficulté de la map")}
            series={(["aim", "speed", "strain"] as const)
              .map((field, i) => ({
                name: [t("Aim"), t("Speed"), t("Strain")][i],
                color: ["#deb0e9", "#8dbbb3", "#e8c389"][i],
                points: analysis.strains
                  .filter((s) => s[field] !== undefined)
                  .map((s) => ({ x: s.time, y: s[field]! })),
              }))
              .filter((s) => s.points.length)}
          />
          <div className="pp-scenarios">
            {analysis.pp.map((p) => (
              <div key={p.accuracy}>
                <span>{p.accuracy} %</span>
                <strong>
                  {Math.round(p.pp)}
                  <small> pp</small>
                </strong>
              </div>
            ))}
          </div>
          <p className="fine-print">
            {t("Scénarios sans miss calculés pour")} {analysis.client} · {analysis.engine}
            {t(". Ce sont des estimations locales.")}
          </p>
        </>
      )}
    </div>
  );
}
