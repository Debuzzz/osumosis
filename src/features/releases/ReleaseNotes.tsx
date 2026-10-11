import { version } from "../../../package.json";
import changelog from "../../../CHANGELOG.md?raw";
import { Dialog } from "../../components/Dialog";
import { t } from "../../lib/i18n";
import { getChangelogRelease } from "./changelog";

export function ReleaseNotes({ onClose }: { onClose: () => void }) {
  const release = getChangelogRelease(changelog, version);

  return (
    <Dialog title={t("Release notes")} onClose={onClose}>
      <span className="badge">
        {version} · {release?.date ?? t("Unreleased")}
      </span>
      {release?.sections.length ? (
        <div className="release-notes">
          {release.sections.map(({ title, changes }) => (
            <section key={title}>
              <h3>{title}</h3>
              <ul>
                {changes.map((change, index) => (
                  <li key={`${title}-${index}`}>{change}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p>{t("No release notes are available for this version yet.")}</p>
      )}
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
