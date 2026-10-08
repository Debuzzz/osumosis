import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, LogOut, RefreshCw, UserRound } from "lucide-react";
import type { AccountStatus } from "../shared/types";
import { api } from "./api";
import { Dialog } from "./Dialog";
import { t, locale } from "./i18n";
import { openExternal, reserveExternalWindow } from "./desktop";

export function Account({
  onSettings,
  notify,
}: {
  onSettings: () => void;
  notify: (text: string) => void;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["account"],
    queryFn: () => api<AccountStatus>("/api/account"),
    refetchInterval: (query) => (query.state.data?.pending ? 1500 : false),
    refetchOnWindowFocus: true,
  });
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const profile = query.data?.profile;
  const connect = async () => {
    const reserved = reserveExternalWindow();
    setBusy(true);
    try {
      const data = await api<{ url: string }>("/api/account/connect", {});
      await openExternal(data.url, reserved);
      await client.invalidateQueries({ queryKey: ["account"] });
    } catch (error) {
      reserved?.close();
      notify(t((error as Error).message));
    } finally {
      setBusy(false);
    }
  };
  const change = async (route: "refresh" | "disconnect") => {
    setBusy(true);
    try {
      await api("/api/account/" + route, {});
      await client.invalidateQueries({ queryKey: ["account"] });
    } catch (error) {
      notify(t((error as Error).message));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        className="profile-button"
        aria-label={
          profile
            ? t("Compte osu! : {{name}}", { name: profile.username })
            : t("Connecter mon compte osu!")
        }
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <UserRound size={18} />}
        <span>{profile?.username || t("Connexion osu!")}</span>
      </button>
      {open && (
        <Dialog
          title={profile ? t("Mon compte osu!") : t("Connecter mon compte osu!")}
          onClose={() => setOpen(false)}
        >
          {query.isError && (
            <div className="error-box" role="alert">
              {query.error.message}
            </div>
          )}
          {query.data?.error && (
            <div className="error-box" role="alert">
              {t(query.data.error)}
            </div>
          )}
          {profile ? (
            <>
              <div className="account-summary">
                {profile.avatarUrl && <img src={profile.avatarUrl} alt="" />}
                <div>
                  <h3>{profile.username}</h3>
                  <p>
                    {profile.countryCode} · {profile.playmode}
                  </p>
                  <strong>
                    {profile.pp === null
                      ? "—"
                      : profile.pp.toLocaleString(locale(), { maximumFractionDigits: 0 })}{" "}
                    pp
                  </strong>
                  {profile.globalRank && (
                    <span> #{profile.globalRank.toLocaleString(locale())}</span>
                  )}
                </div>
              </div>
              <p className="muted">
                {t(
                  "Profil en cache. Les meilleurs scores seront intégrés au moteur de farm dans une prochaine version.",
                )}
              </p>
              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void change("refresh")}
                >
                  <RefreshCw size={15} />
                  {t("Actualiser le profil")}
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    void openExternal(`https://osu.ppy.sh/users/${profile.id}`).catch((error) =>
                      notify(error.message),
                    )
                  }
                >
                  <ExternalLink size={15} />
                  {t("Page officielle")}
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void change("disconnect")}
                >
                  <LogOut size={15} />
                  {t("Déconnecter")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                {t(
                  "osu! ouvrira une page dans ton navigateur pour autoriser l’accès à ton identité et à ton profil public. Aucun mot de passe osu! n’est demandé dans l’application.",
                )}
              </p>
              {!query.data?.configured && (
                <>
                  <p>
                    {t(
                      "Crée une application OAuth osu!, puis renseigne son Client ID et son secret dans les Réglages.",
                    )}
                  </p>
                  <label className="oauth-callback-label">
                    {t("Adresse de retour à enregistrer")}
                    <input
                      readOnly
                      value={query.data?.redirectUri || ""}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </label>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setOpen(false);
                      onSettings();
                    }}
                  >
                    {t("Ouvrir les Réglages")}
                  </button>
                </>
              )}
              {query.data?.pending && (
                <p role="status">
                  {t("Autorisation en attente dans le navigateur. Reviens ici après validation.")}
                </p>
              )}
              <button
                className="primary-button"
                disabled={busy || !query.data?.configured}
                onClick={() => void connect()}
              >
                {busy ? <LoaderCircle className="spin" size={16} /> : <ExternalLink size={16} />}
                {query.data?.pending ? t("Relancer la connexion") : t("Autoriser sur osu!")}
              </button>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
