# Changelog

Changes are grouped by version following [Keep a Changelog](https://keepachangelog.com/), using [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Branded README with a social preview banner, project badges and quick links.
- Contribution guidance explicitly welcomes reviewed and verified AI-assisted/vibe-coded PRs, with issues for ideas that need discussion first.

### Added

- Repository social preview artwork and instructions for uploading it on GitHub.

## [0.4.0] - 2026-10-09

### Added

- Project agent instructions and an osu!mosis development skill covering architecture, local-first behavior, localization, validation and versioned PRs.
- Detailed user guide linked from the concise README, plus localization regression checks.
- Interactive patch/minor/major release command, synchronized npm/Tauri versions, dated notes and version checks before commit/push and desktop builds.
- Commit/push Git hooks and Windows/Linux quality CI with strict lint, formatting, types, architecture, tests and builds.
- Combined plays/live view with automatic switching and manual history selection.
- Shared score widgets for saved attempts, snapshots for new captures and FC PP in the timeline.
- Visible tag, song-source, mapper and difficulty filters in the library and recommendations.
- Tauri 2 desktop window with an embedded local Node backend and application-directory storage.
- osu! OAuth authorization in the browser, cached public profile, refresh and disconnect.
- English/French translations, per-device language preference and documentation for adding languages.
- In-app release notes.
- Windows/macOS/Linux build workflow and draft GitHub releases on `v*` tags.

### Changed

- English is the UI source/default/fallback language. Translation keys use English, while saved French preferences remain supported.
- English documentation, roadmap and changelog; a shorter README links to detailed setup and feature guides.
- Feature-based architecture: backend routes/services/repositories, frontend views/components, and App retained as global composition.
- Typed catalogue RPC contract, separate tosu transport/normalization/capture and split stylesheets.
- Side-by-side timeline and errors with the score below; misses/sliderbreaks grouped by second.
- Settings remain in the sidebar; the avatar opens the osu! account panel.
- Small-window navigation, native dialog focus handling, keyboard and reduced-motion improvements.

### Fixed

- Canonical lazer-root resolution before filesystem checks, with Windows temporary-path tests and alias/junction coverage.
- LF endings enforced by Git and Prettier to prevent widespread formatting failures after Windows checkouts.
- UI version read from package.json; desktop version aligned with npm.
- Lazer reading uses the persisted Realm model name `File`.
- Play capture uses dedicated gameplay/replay status, result settling and start synchronization to avoid phantom retries.

## [0.1.0]

### Added

- Local React/TypeScript/Vite companion with a Node/Fastify backend.
- SQLite index, stable library, search, collections and local calculations.
- Stable/lazer profiles and Realm snapshot reading.
- Cached osu! discovery with a five-searches-per-minute budget, initial recommendations and scroll loading.
- tosu capture, local diagnostics and live dashboard.

[Unreleased]: https://github.com/Debuzzz/osumosis/compare/main...HEAD
[0.1.0]: https://github.com/Debuzzz/osumosis
