import { Check, FolderOpen } from "lucide-react";
import type { DetectedLibraries } from "../../../../shared/types";
import { t } from "../../../lib/i18n";
import type { SettingsField, SettingsForm } from "../model";
export function LibrarySettings({
  form,
  field,
  libraryField,
  detectedPaths = { stable: [], lazer: [] },
  libraryChanged,
}: {
  form: SettingsForm;
  field: SettingsField;
  libraryField: (key: "osuPath" | "songsPath", value: string) => void;
  detectedPaths?: DetectedLibraries;
  libraryChanged: boolean;
}) {
  return (
    <section className="settings-section">
      <div className="section-title">
        <FolderOpen size={19} />
        <h2>{t("Bibliothèque osu!")}</h2>
        <span className="badge">{t("Lecture seule")}</span>
      </div>
      <div className="client-switch" role="group" aria-label={t("Client osu! sélectionné")}>
        {(["lazer", "stable"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={form.client === value}
            className={`secondary-button ${form.client === value ? "active" : ""}`}
            onClick={() => field("client", value)}
          >
            osu!{value}
            {form.client === value && <Check size={15} />}
          </button>
        ))}
      </div>
      <p>
        {t(
          "Chaque profil conserve ses dossiers. Les réglages de tosu, de découverte et les préférences sont communs.",
        )}
      </p>
      <label>
        {form.client === "lazer"
          ? t("Dossier de données lazer")
          : t("Dossier d’installation stable")}
        <input
          value={form.libraries[form.client].osuPath}
          placeholder={
            form.client === "lazer"
              ? "C:\\Users\\ton_compte\\AppData\\Roaming\\osu"
              : "C:\\Users\\ton_compte\\AppData\\Local\\osu!"
          }
          onChange={(event) => libraryField("osuPath", event.target.value)}
        />
      </label>
      {!!detectedPaths[form.client].length && (
        <div className="detected-paths">
          {t("Détecté :")}{" "}
          {detectedPaths![form.client].map((folder) => (
            <button type="button" key={folder} onClick={() => libraryField("osuPath", folder)}>
              {folder}
              <Check size={13} />
            </button>
          ))}
        </div>
      )}
      {form.client === "stable" ? (
        <>
          <label>
            {t("Dossier Songs personnalisé")} <span className="muted">{t("facultatif")}</span>
            <input
              value={form.libraries.stable.songsPath}
              placeholder={t("Par défaut : dossier osu!\\Songs")}
              onChange={(event) => libraryField("songsPath", event.target.value)}
            />
          </label>
          <p>{t("Les fichiers .osu, osu!.db et collection.db sont lus sur place.")}</p>
        </>
      ) : (
        <p>
          {t(
            "Choisis le dossier contenant la base client.realm (ou client_<version>.realm) et le dossier files. Ferme lazer avant d’indexer, puis relance-le pour jouer avec tosu. Les médias sont lus dans le stockage lazer ; la base est consultée sur une copie locale.",
          )}
        </p>
      )}
      {libraryChanged && (
        <p className="notice">
          {t(
            "Enregistre ce profil avant de l’indexer. Les maps installées seront vérifiées pour cette bibliothèque.",
          )}
        </p>
      )}
    </section>
  );
}
