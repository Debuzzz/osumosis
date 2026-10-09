import { Target } from "lucide-react";
import { t } from "../../../lib/i18n";
import type { SettingsField, SettingsForm } from "../model";
export function PreferencesSettings({ form, field }: { form: SettingsForm; field: SettingsField }) {
  return (
    <section className="settings-section">
      <div className="section-title">
        <Target size={19} />
        <h2>{t("Initial preferences")}</h2>
      </div>
      <div className="form-grid">
        <label>
          {t("Target difficulty")}
          <input
            type="number"
            min="0"
            max="20"
            step="0.1"
            value={form.targetStars}
            onChange={(event) => field("targetStars", Number(event.target.value))}
          />
        </label>
        <label>
          {t("Simulation mods")}
          <select
            value={form.preferredMods}
            onChange={(event) => field("preferredMods", event.target.value)}
          >
            {["NM", "HD", "HR", "DT", "HDDT", "HDHR", "HT", "EZ"].map((mods) => (
              <option key={mods}>{mods}</option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {t("Simulations use the selected profile's rules: osu!")}
        {form.client}.
      </p>
    </section>
  );
}
