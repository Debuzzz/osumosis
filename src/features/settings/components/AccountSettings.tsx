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
        <h2>{t("Compte osu! et découverte")}</h2>
        <span className="badge">{t("5 appels / minute")}</span>
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
                ? t("Déjà enregistré · vide pour conserver")
                : t("Secret de ton application OAuth")
            }
            onChange={(event) => field("clientSecret", event.target.value)}
            autoComplete="new-password"
          />
        </label>
      </div>
      <p>
        {t(
          "Les identifiants restent dans le service local. La bibliothèque fonctionne aussi sans connexion à osu!.",
        )}
      </p>
      <label>
        {t("Adresse de retour OAuth à enregistrer sur osu!")}
        <input readOnly value={redirectUri} onFocus={(event) => event.currentTarget.select()} />
      </label>
      <p>
        {t(
          "Après enregistrement, clique sur le profil en haut à droite pour autoriser l’accès à ton compte.",
        )}
      </p>
      <a
        className="text-link"
        href="https://osu.ppy.sh/home/account/edit#oauth"
        target="_blank"
        rel="noreferrer"
      >
        {t("Créer une application OAuth osu!")}
        <ExternalLink size={13} />
      </a>
    </section>
  );
}
