import type { Status } from "../../../shared/types";
import { t } from "../../lib/i18n";

export function Footer({ status }: { status?: Status }) {
  return (
    <footer className="footer">
      <span>
        <i className="connection-dot on" /> {t("Local service · 127.0.0.1")}
      </span>
      <span>
        {status?.api.cacheHits ?? 0} {t("responses reused")}{" "}
        <span className="footer-divider">/</span> {status?.api.requests ?? 0}{" "}
        {t("/ 5 requests this minute")}
      </span>
    </footer>
  );
}
