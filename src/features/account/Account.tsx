import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, LogOut, RefreshCw, UserRound } from "lucide-react";
import { useState } from "react";
import type { AccountStatus } from "../../../shared/types";
import { Dialog } from "../../components/Dialog";
import { api } from "../../lib/api";
import { openExternal, reserveExternalWindow } from "../../lib/desktop";
import { locale, t } from "../../lib/i18n";

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
            ? t("osu! account: {{name}}", { name: profile.username })
            : t("Connect my osu! account")
        }
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <UserRound size={18} />}
        <span>{profile?.username || t("Connect osu!")}</span>
      </button>
      {open && (
        <Dialog
          title={profile ? t("My osu! account") : t("Connect my osu! account")}
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
                  "Cached profile. Top scores will be integrated into the farm engine in a future version.",
                )}
              </p>
              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void change("refresh")}
                >
                  <RefreshCw size={15} />
                  {t("Refresh profile")}
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
                  {t("Official page")}
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void change("disconnect")}
                >
                  <LogOut size={15} />
                  {t("Disconnect")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                {t(
                  "osu! will open a page in your browser to authorize access to your identity and public profile. The application never asks for your osu! password.",
                )}
              </p>
              {!query.data?.configured && (
                <>
                  <p>
                    {t(
                      "Create an osu! OAuth application, then enter its Client ID and secret in Settings.",
                    )}
                  </p>
                  <label className="oauth-callback-label">
                    {t("Callback URL to register")}
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
                    {t("Open Settings")}
                  </button>
                </>
              )}
              {query.data?.pending && (
                <p role="status">
                  {t("Waiting for authorization in your browser. Return here after approving.")}
                </p>
              )}
              <button
                className="primary-button"
                disabled={busy || !query.data?.configured}
                onClick={() => void connect()}
              >
                {busy ? <LoaderCircle className="spin" size={16} /> : <ExternalLink size={16} />}
                {query.data?.pending ? t("Restart connection") : t("Authorize on osu!")}
              </button>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
