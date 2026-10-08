import { t, locale } from './i18n';
import { useQuery } from '@tanstack/react-query';
import type { CaptureStatus, TosuDiagnostic } from '../shared/types';
import { api } from './api';

export function TosuDiagnostics() {
  const query = useQuery({ queryKey: ['tosu-diagnostics'], queryFn: () => api<{ capture: CaptureStatus; lastSeen: string | null; events: TosuDiagnostic[] }>('/api/tosu/diagnostics'), refetchInterval: 4000 });
  return <details className="tosu-diagnostics"><summary>{t("Diagnostic de capture tosu")}</summary>
    <p>{t("Le journal contient les connexions, changements d’état et sauvegardes ; il est aussi écrit dans")} <code>{t(".data/tosu.log")}</code>.</p>
    {query.isError && <div className="error-box">{query.error.message}</div>}
    {query.data && <><div className="diagnostic-stats"><span>{query.data.capture.messages.toLocaleString(locale())} {t("messages reçus")}</span><span>{query.data.capture.saved} {t("tentatives sauvegardées depuis le démarrage")}</span><span>{t("Statut partie/replay :")} {query.data.capture.statusConnected ? t("connecté") : t("indisponible")}</span></div>
      {query.data.capture.error && <div className="error-box" role="alert">{query.data.capture.error}</div>}
      <p>{t(query.data.capture.reason)}</p>
      <div className="diagnostic-events">{[...query.data.events].reverse().map((event, index) => <div key={event.time + index} className={event.level}><time>{new Date(event.time).toLocaleTimeString(locale())}</time><code>{event.event}</code><span>{event.message}</span></div>)}</div>
    </>}
  </details>;
}
