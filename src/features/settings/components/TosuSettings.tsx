import { ExternalLink, Radio } from "lucide-react";
import { t } from "../../../lib/i18n";
import { TosuDiagnostics } from "../../telemetry/TosuDiagnostics";
import type { SettingsField, SettingsForm } from "../model";
export function TosuSettings({ form, field }: { form: SettingsForm; field: SettingsField }) {
  return (
    <section className="settings-section">
      <div className="section-title">
        <Radio size={19} />
        <h2>{t("Tosu telemetry")}</h2>
      </div>
      <label>
        {t("WebSocket address")}
        <input value={form.tosuUrl} onChange={(event) => field("tosuUrl", event.target.value)} />
      </label>
      <p>
        {t(
          "Tosu must run on this computer. The application reconnects automatically. The v2 stream provides values; the local /tokens stream confirms play/replay mode.",
        )}
      </p>
      <TosuDiagnostics />
      <a className="text-link" href="https://tosu.app/" target="_blank" rel="noreferrer">
        {t("Tosu website")}
        <ExternalLink size={13} />
      </a>
    </section>
  );
}
