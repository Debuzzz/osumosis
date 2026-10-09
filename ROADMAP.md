# osu!mosis — roadmap

## Delivered in 0.1

- [x] Terminal service and React/Vite interface on localhost.
- [x] SQLite catalogue, `.osu` indexing and `osu!.db` metadata.
- [x] Stable collections, retaining missing map references.
- [x] Text search/comparators, filters, cards and map details.
- [x] Local media and cached online thumbnails.
- [x] Local difficulty, strain and PP calculations with mods.
- [x] tosu connection and attempt history with errors recorded as intervals.
- [x] Official discovery, cursors, cache and a shared five-searches-per-minute budget.
- [x] Initial recommendations based on difficulty, diversity and history.

## Profile and personalized recommendations

- [x] User OAuth with `public identify`, local callback, state and refresh tokens; cached public profile.
- [ ] Validate OAuth with a real account and prepare public distribution authentication without an embedded secret.
- [ ] Snapshot top plays, recent scores and profiles by ruleset, using shared cache.
- [ ] Versioned `scores.db` import without assuming it contains replay frames.
- [ ] Profiles by mode, mods/speed, characteristics and comparable performances.
- [ ] Accuracy scenarios derived from history, with explicit confidence.
- [ ] Weighted PP gains: known ranking, replacement of the relevant score, and distinction between raw PP and total PP gains.
- [ ] Recommendation history, feedback, exclusions, favorites and a play queue.
- [ ] Training and Similar scenarios based on patterns, with documented heuristics.
- [ ] Progressive feature precomputation; calculate shortlisted candidates with mods.
- [ ] Targeted acquisition of uninstalled analysis files when available, without implicit installation.
- [ ] Discovery limited to two pages per job, with progress and cancellation.
- [ ] Stream user-provided official datasets.

## Plays and replays

- [x] Correct gameplay/replay detection using the dedicated tosu status channel, settle results and expose capture diagnostics with a local log.
- [x] Live view: local background, compact counters, observed/FC PP and scenarios from tosu.
- [x] Combined live/history view, automatic and manual modes, and shared widgets for saved attempts.
- [x] Score/statistics snapshots for new captures; display older data without inventing missing fields.
- [x] Side-by-side timeline and errors, grouping errors within the same second.

- [ ] Precise tosu events, timing errors and keys, normalized by version/capabilities.
- [ ] Compressed health, UR and timing series; explicit pauses and connection gaps.
- [ ] Import/index `.osr` files and associate them with the exact checksum.
- [ ] Lazer replay extensions: statistics, parameterized mods, pauses and score IDs.
- [ ] Canvas player with cursor/keys, audio, seeking, speed and looping.
- [ ] osu!standard reconstruction accounting for stacking, sliders, hit windows and historical rules.
- [ ] Compare reconstructed judgments with replay statistics; otherwise mark analysis as partial.
- [ ] Map-aligned strain/accuracy/combo/PP/timing timelines, with speed-aware axes.
- [ ] taiko/mania/catch analysis using their own rules and validated capabilities.
- [ ] Compare compatible attempts and produce reliable error heatmaps.
- [ ] Download replays through the API when available, with caching and refusal handling.
- [ ] Session statistics, early/late bias, consistency and problematic sections.

## Enriched library

- [ ] Application collections and smart collections.
- [ ] Export collections to a new file without overwriting the game's database.
- [ ] Tags, notes, backup/restore and CSV/JSON exports.
- [ ] Shared SQL/API search parser: AST, units, dates and documented aliases.
- [ ] PP, accuracy, misses, sliderbreaks, replay and characteristic filters.
- [x] Visible metadata filters (tags, source, mapper, version) and recommendation search.
- [x] Scroll loading in batches of 20 complete sets, with local filters and sorting.
- [ ] Virtualize large lists.
- [ ] Field provenance/freshness and explicit local/API conflict resolution.
- [ ] Read variable durations/BPM and slider ends through the map engine.
- [ ] Detect duplicates and compare revisions.

## Lazer and operations

- [x] Separate stable/lazer profiles, lazer as the default for new configurations, and migration of older settings.
- [x] Stable/lazer calculations with separate client caches.
- [x] Read-only Realm snapshot prototype with schema-field validation, maps, media and collections.
- [x] Validate native Realm and repeated indexing of a synthetic database in the cloud without changing the source.
- [ ] Validate real Windows lazer libraries across versions, missing files and deleted sets.
- [x] Document npm startup and provide a native dependency check.
- [ ] Import exported `.osz`, `.osr` and `collection.db` files as a fallback.
- [ ] Stable/lazer/replay opening adapters with explicit protocol-handler capabilities.
- [ ] CLI recommendation command.
- [ ] Capability, quota, API-call, cache and freshness diagnostic dashboard.
- [ ] Resumable jobs, migrations and reproducible cache limits.
- [x] Tauri 2 configuration, companion Node runtime and native resources prepared for the build OS.
- [x] GitHub Actions Windows/macOS/Linux workflow, manual artifacts and draft releases on tags.
- [x] Track Cargo.lock for reproducible desktop dependency resolution.
- [ ] Build and test installers on target operating systems.
- [ ] Windows signing, macOS notarization and update strategy.

## Interface and distribution

- [x] One main Settings entry and the osu! profile in the top-right corner.
- [x] Compact navigation, visible focus, skip link, native dialogs and reduced-motion support.
- [x] i18next localization, English/French and persistent language selection.
- [x] English source/default/fallback language, matching translation keys and language-behavior checks.
- [x] Keep a Changelog history, in-app notes and generated release notes.
- [ ] Visual and keyboard audits on real WebViews, contrast and long labels.
- [ ] Structured translation of backend domain errors and RTL support.
- [ ] Merge library/recommendations, add mod filters and farm scenarios based on PP gains.
- [ ] Customizable widgets for live views and saved attempts.
- [ ] CSS theme editor in Settings, with preview and default-theme restoration.

## Code structure and quality

- [x] Modular monolith: backend features with routes, services and repositories.
- [x] App limited to global composition; separate views, components, hooks, tools and styles.
- [x] Typed RPC contract, dependency checks and application file-size limits.
- [x] Commit/push hooks and Windows/Linux CI: warning-free lint, formatting, types, architecture, tests and builds.
- [x] Project agent instructions and a development skill covering architecture, local-first behavior, localization and versioned PRs.

## Optional local AI, after the recommendation engine

- [ ] First complete profiles, top plays, mod scenarios and engine-calculated weighted PP gains.
- [ ] Normalize metadata (tags, source, mapper, difficulty) and object-derived characteristics, with provenance and confidence.
- [ ] Local similarity index with precomputed embeddings, checksum/model-version caches and incremental updates.
- [ ] Optional local model adapter through llama.cpp or Ollama, without mandatory loading during gameplay.
- [ ] Convert natural-language requests into parser-validated structured filters, then explain selected candidates.
- [ ] Optional reasoning model for complex explanations, with configurable CPU/GPU/RAM budgets and retained operation without AI.

The model uses the known catalogue and analyses. It must not create implicit osu! calls, replace rosu PP calculations or treat a "farm" tag as proof of gains. This delivery does not include an AI model or runtime.

## Validation when requested

Databases from multiple versions, partial libraries, unsubmitted/modified maps, old replays, missing collection imports, offline use, API 429 responses, concurrent requests, tosu disconnects, pause/retry/fail, PP/judgment correctness and load during gameplay.

The production build is one delivery step. Targeted tests cover settings migration, profiles, hashed paths, filesystem boundaries, calculation caches and localization. `npm run test:realm` separately covers a synthetic Realm database and requires the native module. Game and osu! account integrations still need testing with real data.
