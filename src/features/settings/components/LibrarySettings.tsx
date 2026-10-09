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
        <h2>{t("osu! library")}</h2>
        <span className="badge">{t("Read only")}</span>
      </div>
      <div className="client-switch" role="group" aria-label={t("Selected osu! client")}>
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
      <p>{t("Each profile keeps its folders. Tosu, discovery and preferences are shared.")}</p>
      <label>
        {form.client === "lazer" ? t("Lazer data folder") : t("Stable installation folder")}
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
          {t("Detected:")}{" "}
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
            {t("Custom Songs folder")} <span className="muted">{t("optional")}</span>
            <input
              value={form.libraries.stable.songsPath}
              placeholder={t("Default: osu!\\Songs folder")}
              onChange={(event) => libraryField("songsPath", event.target.value)}
            />
          </label>
          <p>{t("The .osu files, osu!.db and collection.db are read in place.")}</p>
        </>
      ) : (
        <p>
          {t(
            "Choose the folder containing client.realm (or client_<version>.realm) and files. Close lazer before indexing, then reopen it to play with tosu. Media is read from lazer storage; the database is read from a local copy.",
          )}
        </p>
      )}
      {libraryChanged && (
        <p className="notice">
          {t("Save this profile before indexing. Installed maps will be checked for this library.")}
        </p>
      )}
    </section>
  );
}
