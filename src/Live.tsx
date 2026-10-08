import { t, locale } from './i18n';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AudioLines, Check, Radio, Star, Target } from 'lucide-react';
import type { Beatmap, LiveState } from '../shared/types';
import { api } from './api';
import { Chart } from './Chart';
import { TosuDiagnostics } from './TosuDiagnostics';

const timeLabel = (milliseconds: number) => { const seconds = Math.floor(Math.max(0, milliseconds) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
const display = (value: number | undefined, digits = 0) => value === undefined ? '—' : value.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });

function Background({ checksum, local }: { checksum: string; local: boolean }) {
  const [fallback, setFallback] = useState(false), [missing, setMissing] = useState(false);
  useEffect(() => { setFallback(false); setMissing(false); }, [checksum, local]);
  if (missing) return null;
  return <img className="live-backdrop" src={local && !fallback ? `/api/assets/${encodeURIComponent(checksum)}/background` : `/api/live/background?checksum=${encodeURIComponent(checksum)}`} alt="" onError={() => { if (local && !fallback) setFallback(true); else setMissing(true); }} />;
}

export function Live({ live, onSettings }: { live: LiveState; onSettings: () => void }) {
  const p = live.play, m = live.map, capture = live.capture;
  const detail = useQuery({ queryKey: ['detail', m?.checksum], queryFn: () => api<{ map: Beatmap }>('/api/maps/' + encodeURIComponent(m!.checksum)), enabled: !!m?.checksum, retry: false, staleTime: 60000 });
  const first = m?.firstObject || 0, end = m?.duration || 0;
  const progress = end > first ? Math.min(100, Math.max(0, ((m?.time || 0) - first) / (end - first) * 100)) : 0;
  const history = live.history || [];
  const labels: Record<string, string> = { play: t("En partie"), resultScreen: t("Résultat"), selectPlay: t("Sélection de map") };
  const state = capture?.mode === 'replay' ? t("Lecture replay") : live.paused ? t("En pause") : labels[live.state] || live.state;
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span /> {t("RIGHT HERE, RIGHT NOW")}</div><h1>{t("Dans le rythme")}<span>.</span></h1><p>{t("Ta performance, au fil de la map.")}</p></div><span className={`status-pill ${live.connected ? 'connected' : ''}`}><Radio size={14} />{live.connected ? state : t("En attente de tosu")}</span></div>
    {!live.connected ? <div className="empty-panel large"><Radio size={38} /><h2>{t("Prêt quand tu l’es.")}</h2><p>{t("Démarre osu! et tosu. La connexion locale sera réessayée automatiquement toutes les cinq secondes.")}</p><button className="secondary-button" onClick={onSettings}>{t("Vérifier l’adresse tosu")}</button></div> : <>
      <section className="live-stage">
        {m?.checksum && <Background key={m.checksum} checksum={m.checksum} local={!!detail.data?.map.hasBackground} />}
        <div className="live-stage-shade" />
        <div className="live-stage-content">
          <div className="live-track"><div className="eyebrow">{live.client.toUpperCase()} · {p?.mods || 'NM'}{capture?.mode === 'replay' ? ' · REPLAY' : ''}</div><h2>{m?.title || t("Sélectionne une map dans le jeu")}</h2><p>{m?.artist || t("Ta prochaine map t’attend")}{m?.version ? ` · ${m.version}` : ''}</p>{m?.mapper && <small>{t("mapped by")} {m.mapper}</small>}
            <div className="live-map-stats"><span className="live-star"><Star size={13} fill="currentColor" />{display(m?.stars, 2)} ★</span>{[['BPM', m?.bpm], ['AR', m?.ar], ['OD', m?.od], ['CS', m?.cs], ['HP', m?.hp]].map(([label, value]) => <span key={String(label)}>{label}<strong>{display(value as number | undefined, label === 'BPM' ? 0 : 1)}</strong></span>)}</div>
          </div>
          <div className="live-pp-focus"><span className="live-grade">{p?.rank || '—'}</span><div><strong>{display(p?.pp)}</strong><span>pp</span></div><small>{t("observés par tosu")}</small><div className="live-pp-target"><Target size={13} />{display(p?.fcPp)} {t("pp si FC")}</div></div>
        </div>
        <div className="live-stage-progress" role="progressbar" aria-label={t("Progression de la map")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div>
        <div className="live-stage-times"><span>{timeLabel(Math.max(0, (m?.time || 0) - first))}</span><span>{timeLabel(Math.max(0, end - first))}</span></div>
      </section>
      <section className="live-score-strip" aria-label={t("Compteurs de performance")}>
        <div className="live-accuracy"><span>{t("Accuracy")}</span><strong>{display(p?.accuracy, 2)}<small> %</small></strong></div>
        <div><span>{t("Combo")}</span><strong>{display(p?.combo)}<small>×</small></strong><small>{t("max")} {display(p?.maxCombo)} / {display(m?.maxCombo)}</small></div>
        <div className="hit-great"><span>300</span><strong>{display(p?.hits['300'])}</strong></div>
        <div className="hit-good"><span>100</span><strong>{display(p?.hits['100'])}</strong></div>
        <div className="hit-meh"><span>50</span><strong>{display(p?.hits['50'])}</strong></div>
        <div className="hit-miss"><span>{t("Miss")}</span><strong>{display(p?.misses)}</strong></div>
        <div><span>{t("Sliderbreaks")}</span><strong>{display(p?.sliderBreaks)}</strong></div>
      </section>
      <div className="live-analysis-grid">
        <section className="live-panel"><div className="section-title"><Activity size={17} /><h2>{t("Évolution des PP")}</h2><span className="badge">{capture?.mode === 'replay' ? t("Replay") : t("Session live")}</span></div>{history.length ? <Chart label={t("Évolution des PP observés et estimés FC")} series={[{ name: t("PP observés"), color: '#deb0e9', points: history.map(point => ({ x: point.time, y: point.pp })) }, { name: t("PP si FC"), color: '#79c9bf', points: history.map(point => ({ x: point.time, y: point.fcPp })) }]} /> : <div className="live-chart-wait"><AudioLines size={28} /><p>{t("Le graphe se construit pendant la partie ou la lecture du replay.")}</p></div>}</section>
        <section className="live-panel live-estimates"><div className="section-title"><Target size={17} /><h2>{t("Repères")}</h2></div><div className="live-secondary-stats"><div><span>{t("Unstable rate")}</span><strong>{display(p?.ur, 1)}</strong></div><div><span>{t("Score")}</span><strong>{display(p?.score)}</strong></div></div><h3>{t("Scénarios de PP transmis par tosu")}</h3>{live.ppScenarios?.length ? <div className="live-scenarios">{live.ppScenarios.map(scenario => <div key={scenario.accuracy}><span>{scenario.accuracy} %</span><strong>{display(scenario.pp)}<small> pp</small></strong></div>)}</div> : <p className="muted">{t("Les estimations apparaîtront quand tosu aura chargé la map.")}</p>}</section>
      </div>
      <div className="live-capture-status" role="status"><Check size={16} /><div><strong>{capture?.reason ? t(capture.reason) : t("En attente de la télémétrie.")}</strong><span>{capture?.partial ? t("Capture commencée en cours de partie. ") : ''}{capture?.mode === 'unknown' ? t("Mode partie/replay non confirmé par tosu. ") : ''}{capture?.lastSavedAt ? t("Dernière sauvegarde à {{p0}}.", { p0: new Date(capture.lastSavedAt).toLocaleTimeString(locale()) }) : t("Les tentatives jouées sont sauvegardées localement à leur fin.")}</span></div></div>
      {capture?.error && <div className="error-box" role="alert">{capture.error}</div>}
    </>}
    <TosuDiagnostics />
  </>;
}
