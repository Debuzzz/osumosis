# Repository instructions

## Start here

- Read `README.md`, `ROADMAP.md` and `docs/ARCHITECTURE.md` before changing behavior.
- For development, localization, documentation or release work, read and apply `.agents/skills/osumosis-development/SKILL.md`. It is the project-specific development skill; this explicit instruction also makes its guidance available when the client has not registered the skill yet.
- Follow the user's current scope and existing authorization. Use the current checkout; inspect branch/status and preserve user changes before Git operations. Base new PRs on current `origin/main` unless the task specifies another base.

## Project rules

- Keep `src/` frontend, `server/` backend and `shared/` dependency-free contracts. Organize changes by feature; keep App as composition.
- Prefer local data/cache. Keep installed maps distinct from online discoveries. Discovery is explicit and limited to five searches per minute; recommendations return at most five distinct sets.
- Game files are read-only. Lazer reads a copied Realm snapshot. Check canonical filesystem boundaries on both sides and retain protection against symlink/junction escapes.
- Write docs and UI source keys in English. `src/locales/en.json` is the reference/default/fallback; French uses the same keys. Preserve saved language choices and interpolation/plural rules.
- Keep responsive layout, keyboard/focus behavior, accessible labels and reduced-motion support when changing UI.
- Never include real libraries, OAuth secrets/tokens or complete telemetry payloads in Git, fixtures or diagnostics.

## Validation and delivery

- Use `npm ci` and the repository's npm commands; no PowerShell-only workflow.
- Keep LF line endings. Follow `docs/CONTRIBUTING.md` for hooks, checks and Windows troubleshooting.
- Run the checks appropriate to the change and fix failures. Before push, the hook runs `npm run verify`; do not disable checks to publish a broken change.
- Complete requested version bumps before pushing. Use the user-agreed SemVer bump and npm hooks; keep npm/Tauri/Cargo/lockfile versions synchronized. For a versioned PR, use `npm version <bump> --no-git-tag-version`, then commit the generated version files.
- Push the requested branch and open a reviewable PR. Publishing a release tag or merging is a separate action governed by the user's authorization. Report access blockers rather than claiming an uncreated PR exists.
- Distinguish local/cloud verification, Windows CI, real osu!/tosu trials and installer validation in the final report.
