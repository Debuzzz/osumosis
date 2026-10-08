import { Check, Radio } from 'lucide-react';
import type { LiveState } from '../shared/types';
import { t, locale } from './i18n';
import { Performance } from './Performance';
import { PlayTimeline } from './PlayTimeline';

export function Live({ live, onSettings }: { live: LiveState; onSettings: () => void }) {
  const capture = live.capture;
  const labels: Record<string, string> = { play: t('En partie'), playing: t('En partie'), resultScreen: t('Résultat'), selectPlay: t('Sélection de map') };
  const state = capture?.mode === 'replay' ? t('Lecture replay') : live.paused ? t('En pause') : labels[live.state] || live.state;
  return <section className="live-view" aria-label={t('En direct')}>
    <div className="performance-heading"><h2>{t('Dans le rythme')}</h2><span className={`status-pill ${live.connected ? 'connected' : ''}`}><Radio size={14} />{live.connected ? state : t('En attente de tosu')}</span></div>
    {!live.connected ? <div className="empty-panel large"><Radio size={38} /><h2>{t('Prêt quand tu l’es.')}</h2><p>{t('Démarre osu! et tosu. La connexion locale sera réessayée automatiquement toutes les cinq secondes.')}</p><button className="secondary-button" onClick={onSettings}>{t('Vérifier l’adresse tosu')}</button></div> : <>
      <PlayTimeline points={live.history || []} events={live.events || []} errorsAvailable={capture?.mode !== 'replay'} />
      <Performance map={live.map} play={live.play} client={live.client} ppScenarios={live.ppScenarios} />
      <div className="live-capture-status" role="status"><Check size={16} /><div><strong>{capture?.reason ? t(capture.reason) : t('En attente de la télémétrie.')}</strong><span>{capture?.partial ? t('Capture commencée en cours de partie. ') : ''}{capture?.mode === 'unknown' ? t('Mode partie/replay non confirmé par tosu. ') : ''}{capture?.lastSavedAt ? t('Dernière sauvegarde à {{p0}}.', { p0: new Date(capture.lastSavedAt).toLocaleTimeString(locale()) }) : t('Les tentatives jouées sont sauvegardées localement à leur fin.')}</span></div></div>
      {capture?.error && <div className="error-box" role="alert">{capture.error}</div>}
    </>}
  </section>;
}
