import { version } from "../../../package.json";
import { Dialog } from "../../components/Dialog";
import { t } from "../../lib/i18n";

export function ReleaseNotes({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title={t("Release notes")} onClose={onClose}>
      <span className="badge">
        {version} · {t("In preparation")}
      </span>
      <ul className="release-notes">
        <li>{t("Tauri desktop application with a bundled local backend.")}</li>
        <li>{t("osu! account connection and cached public profile.")}</li>
        <li>
          {t("Translatable interface, mobile navigation and improved keyboard accessibility.")}
        </li>
        <li>{t("Stable/lazer profiles, infinite scrolling and tosu capture diagnostics.")}</li>
        <li>
          {t(
            "A shared view for live gameplay and stored attempts, with a timeline and grouped errors.",
          )}
        </li>
      </ul>
      <p>{t("Published versions and installers will be available in GitHub Releases.")}</p>
      <a
        className="secondary-button"
        href="https://github.com/Debuzzz/osumosis/releases"
        target="_blank"
        rel="noreferrer"
      >
        {t("View releases on GitHub")}
      </a>
    </Dialog>
  );
}
