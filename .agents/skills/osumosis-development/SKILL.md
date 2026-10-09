---
name: osumosis-development
description: Develop, review, document, localize and prepare versioned pull requests for osu!mosis while preserving local-first data, stable/lazer boundaries, tosu capture, feature architecture and cross-platform checks.
---

# osu!mosis development

Use this skill for changes to this repository's code, documentation, localization or release workflow. Read only the task-relevant guides after the initial project orientation; avoid loading every module without a reason.

## Establish scope

1. Inspect `git status`, the current branch and the requested base. Preserve existing user changes. Use the existing checkout; use a separate checkout/worktree only when the task needs one or the user requests it.
2. Read [README](../../../README.md), [roadmap](../../../ROADMAP.md) and [architecture](../../../docs/ARCHITECTURE.md). Distinguish implemented behavior from planned work and real integrations from synthetic validation.
3. Follow the user's latest scope and authorization. Choose routine implementation details autonomously; ask only for missing information that materially blocks the task. This skill does not impose an additional approval gate.

## Place changes by responsibility

- Frontend: `src/features/<feature>/` for views, `components/` for shared visuals, `hooks/` for reusable React behavior and `lib/` for formatting/HTTP/localization tools. App owns global composition/navigation.
- Backend: `server/features/<feature>/api.ts`, services, models/schemas, repositories and adapters as needed. Routes receive explicit dependencies; storage runs through the typed catalogue RPC.
- Shared contracts: `shared/` must not import application code. Use type-only imports where appropriate and avoid runtime cycles or feature dependencies on application composition.
- SQLite: preserve migrations and the single catalogue-worker connection. Profile changes retain cache but clear installed flags; collections stay scoped to client/folder.
- Workers: preserve `dist/server/index.js`, `catalog-worker.js`, `analysis-worker.js` and the tsx development bootstrap. Keep Tauri/native staging compatible with the build OS/CPU.
- Keep files focused and below the configured application-file limit. Do not add empty layers or new abstractions just to match a directory template.

## Preserve domain invariants

- Local reads and cache come first. Scrolling/filtering does not trigger online discovery. An explicit discovery action shares the five-searches-per-minute budget and twelve-second spacing. Recommendation results contain at most five distinct sets.
- Keep installed and discovered maps separate. Checksum identifies revisions; metadata tags do not prove patterns, farm potential or weighted PP gains. Preserve stable/lazer scoring cache separation.
- Never write/migrate the game's Realm or stable databases. Read only the copied lazer snapshot. Resolve physical roots/files canonically before checking containment, including Windows short names and junctions; preserve lexical checks for logical `.osu` filenames.
- tosu gameplay/replay detection uses the v2 stream and dedicated status channel. Do not turn replay playback into a played attempt or reintroduce duplicate retry/result saves. Preserve startup/result settling and partial-capture semantics.
- Error timestamps represent observed counter intervals, not exact object IDs. Old captures must remain readable without invented fields. Keep telemetry, graphs, logs and queues bounded.
- OAuth tokens stay server-side, outside Git and diagnostic payloads. Local personal credentials are for testing; a public desktop executable must not embed a shared client secret. Preserve Host/Origin/header checks and approved-link restrictions.

## English-first UI and documentation

Read [localization](../../../docs/LOCALIZATION.md) for UI changes. Use English source strings and matching English keys in `en.json` and `fr.json`; preserve interpolation names and plural forms. English is the default/fallback, but an existing user language choice must survive updates. Add each new language's native name and regional locale.

Keep user/game metadata unchanged. Use `locale()` for numbers/dates and maintain HTML `lang`. Preserve keyboard navigation, native dialogs/focus, accessible names, small-window layouts and reduced motion. Keep CSS cascade order explicit. Validate affected language behavior instead of assuming a translated label proves the switch/fallback works.

Write repository documentation in English. Keep README concise and link setup, behavior and limitations to `docs/`. Update links and examples when moving information; keep implemented features separate from roadmap items.

## Check and deliver

Read [contributing](../../../docs/CONTRIBUTING.md) for commands and versioning. Install with `npm ci`; use the native runtime check when setting up SQLite/rosu/Realm. Do not disable native dependency install scripts, TLS/checksum validation or quality gates.

Use the existing tests relevant to the change. Add targeted regressions when fixing meaningful behavior failures. `npm run check` covers lint, format, types, architecture and version consistency; `npm run verify` also tests and builds. Commit/push hooks and Windows/Linux CI use the same checks. Keep LF even on Windows; canonicalize temporary fixture paths where assertions compare real filesystem paths.

For a requested versioned PR, commit the implementation first, run `npm version patch|minor|major --no-git-tag-version` with the agreed bump, then commit the synchronized npm/Tauri/Cargo/lockfile metadata and dated changelog. Bump before pushing. Do not publish release tags as a side effect of opening a PR. The interactive `npm run release` workflow is for a separately authorized release commit/tag.

Before delivery, review the diff for unintended logic changes, leaked data and stale documentation; make the result concrete and reviewable. Push the branch and create the requested PR using available repository access. If API access is blocked, provide the pushed branch, PR creation link and prepared description, and state that PR creation is still pending. Never infer missing authentication solely from an absent token variable or extract proxy credentials.

Report what changed, checks actually run and material limits. A Linux cloud check is not a Windows installer test or a real lazer/tosu trial. Do not claim any unrun integration, CI result, published release or completed PR.
