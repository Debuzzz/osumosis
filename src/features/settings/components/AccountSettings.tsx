import { ExternalLink, Sparkles } from "lucide-react";
import { t } from "../../../lib/i18n";
import type { SettingsField, SettingsForm } from "../model";
export function AccountSettings({
  form,
  field,
  redirectUri,
}: {
  form: SettingsForm;
  field: SettingsField;
  redirectUri: string;
}) {
  return (
    <section className="settings-section">
      <div className="section-title">
        <Sparkles size={19} />
        <h2>{t("osu! account and discovery")}</h2>
        <span className="badge">{t("5 requests / minute")}</span>
      </div>
      <div className="form-grid">
        <label>
          {t("osu! Client ID")}
          <input
            value={form.clientId}
            inputMode="numeric"
            onChange={(event) => field("clientId", event.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          {t("Client secret")}
          <input
            type="password"
            value={form.clientSecret}
            placeholder={
              form.hasClientSecret
                ? t("Already saved · leave blank to keep")
                : t("Your OAuth application secret")
            }
            onChange={(event) => field("clientSecret", event.target.value)}
            autoComplete="new-password"
          />
        </label>
      </div>
      <p>
        {t(
          "Credentials stay in the local service. The library also works without connecting to osu!.",
        )}
      </p>
      <label>
        {t("OAuth callback URL to register on osu!")}
        <input readOnly value={redirectUri} onFocus={(event) => event.currentTarget.select()} />
      </label>
      <p>{t("After saving, click the profile in the top right to authorize account access.")}</p>
      <a
        className="text-link"
        href="https://osu.ppy.sh/home/account/edit#oauth"
        target="_blank"
        rel="noreferrer"
      >
        {t("Create an osu! OAuth application")}
        <ExternalLink size={13} />
      </a>
    </section>
  );
}
