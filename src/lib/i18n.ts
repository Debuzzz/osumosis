import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

export const languages = [
  { code: "fr", name: "Français" },
  { code: "en", name: "English" },
] as const;
let saved = "fr";
try {
  saved = localStorage.getItem("osumosis.language") || "fr";
} catch {
  /* Storage can be unavailable. */
}
void i18next.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: languages.some((language) => language.code === saved) ? saved : "fr",
  fallbackLng: "fr",
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false,
});
export const t = (key: string, values?: Record<string, unknown>) =>
  i18next.t(key, values) as string;
export const locale = () => (i18next.language === "en" ? "en-US" : "fr-FR");
export async function setLanguage(language: string) {
  if (!languages.some((item) => item.code === language)) return;
  await i18next.changeLanguage(language);
  try {
    localStorage.setItem("osumosis.language", language);
  } catch {
    /* Keep the session language. */
  }
}
i18next.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});
document.documentElement.lang = i18next.language;
export default i18next;
