import type { Status } from "../../../shared/types";
import { t } from "../../lib/i18n";

export function Footer({ status }: { status?: Status }) {
  return (
    <footer className="footer">
      <span>
        <i className="connection-dot on" /> {t("Service local · 127.0.0.1")}
      </span>
      <span>
        {status?.api.cacheHits ?? 0} {t("réponses réutilisées")}{" "}
        <span className="footer-divider">/</span> {status?.api.requests ?? 0}{" "}
        {t("/ 5 appels cette minute")}
      </span>
    </footer>
  );
}
