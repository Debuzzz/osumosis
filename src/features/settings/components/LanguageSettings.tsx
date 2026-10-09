import { useTranslation } from "react-i18next";
import { languages, setLanguage, t } from "../../../lib/i18n";
export function LanguageSettings() {
  const { i18n } = useTranslation();
  return (
    <section className="settings-section">
      <h2>{t("Langue et affichage")}</h2>
      <label>
        {t("Langue de l’interface")}
        <select value={i18n.language} onChange={(event) => void setLanguage(event.target.value)}>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        {t(
          "Le choix est enregistré sur cet appareil. Les traductions peuvent être étendues sans modifier les composants.",
        )}
      </p>
    </section>
  );
}
