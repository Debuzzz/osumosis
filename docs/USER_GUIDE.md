# User guide

## Install and start locally

Install a current Node.js LTS release and npm (22.13+ for development), with architecture matching the native modules. Keep osu!stable or osu!lazer on the same computer. [tosu](https://github.com/tosuapp/tosu) is optional for browsing but required for live telemetry and attempt capture.

Installation needs access to `registry.npmjs.org`, GitHub native binaries and `static.realm.io`. It does not require .NET or Docker. Run these commands in cmd.exe, Git Bash or a shell:

```sh
npm ci
npm run check:runtime
npm run build
npm start
```

Open **http://127.0.0.1:3000**. Stop with Ctrl+C, or `npm start -- stop` in another terminal. `check:runtime` loads SQLite, rosu and Realm: a successful npm install alone does not guarantee a native download succeeded. If Realm is unavailable, check HTTPS access to `static.realm.io`, run `npm rebuild realm`, then repeat the check.

For source development, use `npm run dev`. For desktop mode and OS prerequisites, see [DESKTOP.md](DESKTOP.md). Running directly on the computer provides game-file and localhost access; a Docker container would need explicit mounts and different networking.

`OSUMOSIS_PORT` changes the npm backend port; adjust the Vite proxy if developing on another port. Tauri and its default OAuth callback use port 3000. `OSUMOSIS_DATA` changes npm-mode data storage; Tauri has a separate application directory.

## Choose stable or lazer

1. Open **Settings** and select **osu!lazer** or **osu!stable**.
2. Fill in that profile's folders. Switching profiles retains both sets of paths.
3. Save, then index the saved profile. Changing client/folders retains cached metadata but clears installed flags until the new scan.
4. Start osu! and tosu to enable capture.

**Lazer** is the default for new settings. Choose its data directory, usually `%APPDATA%\osu` on Windows, containing `client.realm` (or `client_<version>.realm`) and `files`. Use the game's configured folder if storage was moved. Close lazer before indexing and reopen it to play. The indexer picks the most recently modified client database, copies it into application storage and opens only that read-only copy. Maps, media and collections come from Realm references; hashed filenames alone do not prove installation. Unsupported schemas fail without migrating the game database; delete-pending sets are excluded.

Direct lazer reading is experimental and needs validation with the installed game version and real library. Historical scores/replays are not imported. Indexing is manual to avoid copying a database during gameplay.

**Stable** uses the folder containing `osu!.db` and `collection.db`. Override Songs only if it is elsewhere. Stable file watching remains available. Old stable-only settings migrate while retaining paths/preferences; new settings default to lazer. The chosen client determines PP simulation rules, with separate stable/lazer caches.

The initial tosu URL is `ws://127.0.0.1:24050/websocket/v2`. tosu, OAuth and general preferences are shared between profiles. English is the initial UI language; choose French in **Settings → Language and display**. Existing language choices are retained.

## Connect osu! and discover maps

The local library works without OAuth credentials. Online discovery needs the Client ID/secret of a personal osu! OAuth application. See [OAUTH.md](OAUTH.md) for the exact callback, account linking and token storage.

Discovery performs at most **five official searches per minute**, spaced twelve seconds apart. Installed maps and online discoveries stay distinct:

- **Installed maps**: files observed in the selected library's index.
- **Catalog**: all metadata already saved; browsing makes no new API request.
- **Discover**: maps not installed. Explicit search buttons request osu!, then apply local filters to cached results.

Local predicates are removed from the remote query; filtering a returned page does not mean the full online catalogue was filtered. **Discover more** follows the official cursor. Identical initial searches are cached for fifteen minutes. Scroll always reads SQLite and never starts discovery.

Recommendations return five distinct sets using NM stars, duration, known history and diversity. They do not yet model your weighted PP gains, personal success probabilities or full mod-specific farm potential.

## Search

```text
stars>=5 stars<6.5 bpm>180 length<180
creator="Sotarks" status=r,l
collection:"DT farm" played=false
artist="Camellia" local=true
tags="stream" source="Touhou" creator="Sotarks"
```

Free text uses the full-text index. Terms and constraints combine with AND. Text fields are ASCII-case-insensitive; free text also removes accents.

| Type    | Fields                                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Numeric | `stars`, `difficulty`, `bpm`, `length` (seconds), `ar`, `od`, `cs`, `hp`, `objects`, `plays`, `mode`, `id` |
| Text    | `artist`, `title`, `creator`, `mapper`, `version`, `tag`, `tags`, `source`                                 |
| Other   | `status`, `collection`, `local`, `played`                                                                  |

Advanced filters add tags, song source, mapper and difficulty name to the query and are also available for recommendations. Values come from `.osu` or cached discoveries. `tags="stream jump"` searches that phrase; `tag=stream tag=jump` requires both terms separately. Metadata does not prove actual patterns or farm potential. Unknown difficulty is not zero. Unsupported PP, UR and replay filters return explicit errors.

The library initially shows 20 complete mapset cards, then adds 20 near the bottom. A button also loads more or retries. Changing search, filters, collection or sort starts a new result list.

## Plays and tosu diagnostics

**Your plays** combines live and history. **Automatic** follows gameplay, pause and replay, stays on results until returning to the menu, then selects the saved attempt. It acts within that view instead of changing pages while browsing the library/settings. **History** and **Live** are manual overrides.

Selected attempts reuse live score widgets. Timeline and errors sit side by side on wide windows, with the map/score below; narrow windows use a column. Errors within one second share a row/marker while preserving miss and sliderbreak counts.

New captures retain counters, grade, total score, map statistics and available tosu PP scenarios. Old captures show `—` for values that were not stored. This is saved telemetry rather than `.osr` frame playback. Recognized replays remain visible without creating played attempts; their error events are not yet captured.

Observed attempts save on result, fail, retry, quit or interruption. Startup waits at least 350 ms for consistent values because tosu can briefly publish preview time or previous counters after entering play. A clock reset without gameplay progress is not a retry. Results wait briefly for final values. Mid-map capture is marked partial and does not invent earlier error events.

`settings.replayUIVisible` is a UI preference rather than proof of replay playback. osu!mosis also reads the same tosu instance's `/tokens` StreamCompanion status: `2` means gameplay and `8` replay. If unavailable, mode remains unconfirmed. Historical score/replay import is separate roadmap work.

**Tosu capture diagnostics** in Plays/Settings shows connection, transitions, saves and errors. Events also go to the terminal and `.data/tosu.log`, rotating at 512 KiB to `tosu.log.1`. Logs exclude complete payloads/OAuth settings. Diagnostic save counts cover the current service run; Plays shows historical totals.

For a telemetry snapshot, open `http://127.0.0.1:24050/json/v2`, refresh during gameplay and again on results. Remove personal names and paths before sharing it. In cmd.exe, read the log with `type .data\tosu.log`. Live backgrounds use local indexed media first, then tosu's current background, without fetching an online cover.

## Storage and backup

Browser/npm mode uses `.data` or `OSUMOSIS_DATA`. Desktop mode uses its own [Tauri data directory](DESKTOP.md).

```text
.data/
  settings.json        # paths/preferences and local OAuth secret; excluded from Git
  account.json         # user tokens and cached profile; excluded from Git
  catalog.sqlite       # catalogue, attempts and analyses
  catalog.sqlite-wal   # SQLite journal
  covers/              # reproducible media cache, capped at 256 MiB
  snapshots/           # temporary Realm copies, removed after reading
  tosu.log             # capture events, rotating at 512 KiB
  tosu.log.1           # previous capture log
  desktop-backend.log  # sidecar output in Tauri mode
```

Metadata and attempts are not automatically deleted. Stop the backend before copying the complete data directory for backup. Game files remain unchanged. OAuth files are protected by filesystem permissions, not encryption; exclude them from bug reports and public archives.

## Current limits

- Farm recommendations use initial heuristics; personal profiles and weighted PP gain are planned.
- Replay frames, historical `scores.db` import and per-object judgment reconstruction are not implemented.
- Capture starts with received telemetry; it cannot reconstruct past plays, and mid-map attempts are partial.
- Misses/sliderbreaks are counter differences over observed intervals, not certain object IDs/coordinates.
- Precise key/timing telemetry, parameterized lazer mods and exact replay/strain alignment remain planned.
- `.osu` duration/BPM are approximate with long sliders or tempo changes.
- Realm schemas and real-game integrations need validation; collection exports remain planned.
- `osu://` links depend on the installed client/protocol handler; selecting an exact difficulty is client-dependent.
- Missing local images keep a placeholder; cached-catalog browsing does not implicitly download covers.

See [ROADMAP.md](../ROADMAP.md) for planned work. Protocol references: [osu! API](https://osu.ppy.sh/docs/), [stable databases](https://github.com/ppy/osu/wiki/Legacy-database-file-structure), [tosu v2](https://github.com/tosuapp/tosu/blob/master/packages/tosu/src/api/types/v2.ts) and [rosu-pp-js](https://github.com/MaxOhn/rosu-pp-js).
