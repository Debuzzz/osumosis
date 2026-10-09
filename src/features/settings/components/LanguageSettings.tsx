import { useTranslation } from "react-i18next";
import { languages, setLanguage, t } from "../../../lib/i18n";
export function LanguageSettings() {
  const { i18n } = useTranslation();
  return (
    <section className="settings-section">
      <h2>{t("Language and display")}</h2>
      <label>
        {t("Interface language")}
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
          "Your choice is saved on this device. Translations can be extended without changing components.",
        )}
      </p>
    </section>
  );
}
