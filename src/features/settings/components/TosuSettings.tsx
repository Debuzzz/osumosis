import { ExternalLink, Radio } from "lucide-react";
import { t } from "../../../lib/i18n";
import { TosuDiagnostics } from "../../telemetry/TosuDiagnostics";
import type { SettingsField, SettingsForm } from "../model";
export function TosuSettings({ form, field }: { form: SettingsForm; field: SettingsField }) {
  return (
    <section className="settings-section">
      <div className="section-title">
        <Radio size={19} />
        <h2>{t("Télémétrie tosu")}</h2>
      </div>
      <label>
        {t("Adresse WebSocket")}
        <input value={form.tosuUrl} onChange={(event) => field("tosuUrl", event.target.value)} />
      </label>
      <p>
        {t(
          "tosu doit tourner sur ce PC. L’application se reconnecte automatiquement. Le flux v2 fournit les valeurs ; le flux local /tokens confirme le mode partie/replay.",
        )}
      </p>
      <TosuDiagnostics />
      <a className="text-link" href="https://tosu.app/" target="_blank" rel="noreferrer">
        {t("Site de tosu")}
        <ExternalLink size={13} />
      </a>
    </section>
  );
}
