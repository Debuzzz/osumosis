import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { AccountStatus, PublicSettings, SettingsResponse } from "../../../shared/types";
import { api } from "../../lib/api";
import { t } from "../../lib/i18n";
import { AccountSettings } from "./components/AccountSettings";
import { LanguageSettings } from "./components/LanguageSettings";
import { LibrarySettings } from "./components/LibrarySettings";
import { PreferencesSettings } from "./components/PreferencesSettings";
import { TosuSettings } from "./components/TosuSettings";

export function Settings({
  notify,
  onIndex,
  onSaved,
}: {
  notify: (message: string) => void;
  onIndex: () => void;
  onSaved: () => void;
}) {
  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => api<AccountStatus>("/api/account"),
  });
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<SettingsResponse>("/api/settings"),
  });
  const [form, setForm] = useState<(PublicSettings & { clientSecret: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  useEffect(() => {
    if (query.data) setForm({ ...query.data.settings, clientSecret: "" });
  }, [query.data]);
  const field = (
    key: "client" | "tosuUrl" | "clientId" | "clientSecret" | "targetStars" | "preferredMods",
    value: string | number,
  ) => setForm((previous) => (previous ? { ...previous, [key]: value } : previous));
  const libraryField = (key: "osuPath" | "songsPath", value: string) =>
    setForm((previous) =>
      previous
        ? {
            ...previous,
            libraries: {
              ...previous.libraries,
              [previous.client]: { ...previous.libraries[previous.client], [key]: value },
            },
          }
        : previous,
    );
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await api("/api/settings", form, "PUT");
      onSaved();
      await client.invalidateQueries();
      notify(t("Settings saved. After changing profiles or folders, index the selected library."));
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saved = query.data?.settings;
  const libraryChanged =
    !!form &&
    !!saved &&
    (form.client !== saved.client ||
      JSON.stringify(form.libraries[form.client]) !==
        JSON.stringify(saved.libraries[saved.client]));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> {t("KEEP IT CLOSE")}
          </div>
          <h1>
            {t("Your way")}
            <span>.</span>
          </h1>
          <p>{t("Choose your osu! client and configure its local library.")}</p>
        </div>
      </div>
      {query.isError && <div className="error-box">{query.error.message}</div>}
      {form && (
        <form className="settings-form" onSubmit={save}>
          <LibrarySettings
            form={form}
            field={field}
            libraryField={libraryField}
            detectedPaths={query.data?.detectedPaths}
            libraryChanged={libraryChanged}
          />
          <TosuSettings form={form} field={field} />
          <AccountSettings
            form={form}
            field={field}
            redirectUri={account.data?.redirectUri || ""}
          />
          <PreferencesSettings form={form} field={field} />
          <LanguageSettings />
          <div className="settings-actions">
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
              {t("Save settings")}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy || libraryChanged}
              onClick={onIndex}
            >
              <RefreshCw size={16} />
              {t("Index saved profile")}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
