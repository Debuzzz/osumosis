# Contributing to osu!mosis

Use a current Node.js LTS release (22.13+ for the development tools) and npm. `npm ci` installs dependencies and the Husky Git hooks. Commands work in Git Bash and Git for Windows without PowerShell scripts.

## AI-assisted and vibe-coded contributions

**AI-assisted and vibe-coded PRs are welcome.** The same quality expectations apply to every contribution, regardless of which tools helped write it. You are responsible for understanding, reviewing and validating the code you submit.

A reviewable PR should:

- Solve a clear problem with a focused change and an explanation of the resulting behavior.
- Follow the feature architecture, local-first constraints and conventions described below and in [AGENTS.md](../AGENTS.md).
- Include relevant verification and pass `npm run verify`; add regression coverage when fixing a meaningful behavior failure.
- Keep the diff understandable, with purposeful dependencies and abstractions and accurate documentation.
- Describe what you checked and any remaining uncertainty. Remove generated filler, unrelated rewrites and claims about tests you did not run.

Review the complete diff before submitting it. A generated patch needs the same care as handwritten code; a large code dump without a clear purpose or validation is difficult to review and may be closed or sent back for revision.

### Start with an issue when exploring an idea

For a suggestion, an uncertain design or a broad architecture change, [open an issue](https://github.com/Debuzzz/osumosis/issues/new) first. Check existing issues and the [roadmap](../ROADMAP.md), then describe the problem, an example of the desired behavior and any constraints. AI brainstorming is useful for refining that proposal; the issue should contain a concise, reviewed summary.

For a bug report, include reproduction steps, the expected/actual behavior and relevant versions or redacted diagnostics. Keep OAuth secrets, tokens, private paths and complete personal telemetry out of public reports. Once the scope is clear, a focused PR is welcome.

## Find the right file

- Views: `src/features/<feature>/`; shared visuals: `src/components/`.
- Global navigation and page composition: `src/App.tsx`, `src/app/navigation.ts`.
- Formatting, HTTP, desktop links and language logic: `src/lib/`, `src/hooks/`, `src/locales/`.
- Search filters: `src/features/library/`; validation and SQL compilation: `server/features/maps/`.
- Backend routes: the feature's `api.ts`, then its service/repository.
- Capture behavior: `server/features/telemetry/` transport, normalization and capture policy.
- SQLite schema: `server/infrastructure/database.ts`, using data-preserving migrations.

`shared/` contains common contracts without frontend/backend imports. Backend routes receive their dependencies instead of opening another SQLite connection. A new catalogue repository command updates the inferred RPC contract; a new API module must be registered in `server/app.ts`. See [ARCHITECTURE.md](ARCHITECTURE.md).

Write documentation and UI source strings in English. French stays a supported translation using the same English keys. See [LOCALIZATION.md](LOCALIZATION.md). Repository instructions live in [AGENTS.md](../AGENTS.md), with a project skill in [SKILL.md](../.agents/skills/osumosis-development/SKILL.md).

## Check changes

```sh
npm run format       # apply formatting
npm run check        # lint, format, types, architecture and versions
npm test             # settings, storage, API, localization and simulated tosu capture
npm run test:realm   # index a synthetic Realm library
npm run build        # production frontend and backend
npm run verify       # all push and CI checks
```

Tests use temporary directories instead of the computer's real osu! library. Telemetry tests create their own local WebSocket server. Realm, SQLite and rosu require the native modules installed by npm. A passing cloud build does not validate real Windows gameplay, WebViews or installers but can be close to the real one.

### Windows line endings and paths

Git and Prettier use LF for repository text files. `.gitattributes` keeps LF even with `core.autocrlf=true`. Existing Windows files may still contain CRLF after a pull: run `npm run format`, then `npm run check`. `git ls-files --eol` reports `w/crlf` for such files. Prettier warnings describe formatting differences; exit code 1 intentionally blocks verification.

Windows temporary paths may use short names or junctions. Compare filesystem boundaries using canonical paths on both sides. Keep lexical path checks for logical `.osu` filenames; do not weaken boundary validation to make a platform test pass.

## Commit, push and CI gates

At commit, lint-staged formats staged files and requires lint without errors or warnings. The hooks then check types, architecture and npm/Tauri version consistency. Formatting changes are included in the commit.

Before push, `npm run verify` checks the entire repository, runs tests and builds the frontend/backend. Failure blocks the push. GitHub CI repeats this on Windows and Linux for PRs and pushes to `main`. Hooks are local and can be bypassed; protect `main` and require the quality jobs to enforce checks on GitHub. Rust/installers use the separate desktop workflow.

After checking out changes, run `npm ci` to activate hooks. Review `git status` and commit intended changes before invoking a release command, which expects a clean checkout.

## Prepare a version (For those accepting the PR)

Use one version per release, with the agreed bump completed before pushing a versioned PR. Multiple development commits can belong to one release. The push hook validates versions; interactive selection uses a separate command because Git passes ref updates through the hook's standard input and CI cannot answer a prompt.

Update `[Unreleased]` in `CHANGELOG.md`, commit the changes, then choose the workflow below.

### Versioned PR

example:
```sh
npm version minor --no-git-tag-version
git add package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md
git commit -m "chore(release): prepare next minor version"
git push -u origin your-feature-branch
```

Use the requested `patch`, `minor` or `major` instead of always choosing minor. The npm hooks run all verification, update npm and desktop metadata and move `[Unreleased]` notes into a dated version section. This PR workflow leaves files for review/commit and creates no release tag. Merge the accepted version commit before tagging it from the updated `main` branch.

### Local release commit and tag

```sh
npm run release
# Or supply the selection directly:
npm run release -- minor
```

The prompt lists the next patch/minor/major versions; an empty answer cancels. Patch is for corrections, minor for features and major for compatibility breaks. During `0.x`, a breaking change can be announced in a new minor version.

The npm lifecycle runs `preversion` verification, updates `package.json`/`package-lock.json`, then runs `version` to synchronize `tauri.conf.json`, `Cargo.toml`, the application entry in `Cargo.lock` and dated notes. npm creates a local commit and annotated `vX.Y.Z` tag with commit hooks enabled. The UI reads the npm version directly.

`npm run check:versions` checks consistency; `npm run version:sync` only repairs desktop metadata from the npm version. To publish the release commit and reachable annotated tags:

```sh
git push origin HEAD --follow-tags
```

A `v*` tag triggers desktop builds and a draft GitHub Release. The workflow checks that the tag matches bundled versions. Test the installers before publishing the draft. For protected branches, use the versioned-PR workflow and tag the accepted commit after merge. Creating a version and publishing a tag are separate actions.
