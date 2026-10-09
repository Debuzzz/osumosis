# Tauri desktop

Tauri 2 displays React/CSS in the system WebView and launches a Node sidecar. It uses WebView2 on Windows, WKWebView on macOS and WebKitGTK on Linux. Tauri supplies the native window and desktop integration; the UI remains a web UI that can be customized with CSS.

## Development prerequisites

- A current Node.js LTS release (22.13+ for development) and npm. Desktop CI uses Node 24; quality CI uses Node 22.
- Stable Rust and Cargo from https://rustup.rs/.
- Windows: Visual Studio Build Tools with **Desktop development with C++**, the Windows SDK and WebView2. Rust and Node must use matching CPU architectures and ABIs; x64 is recommended.
- macOS: Xcode Command Line Tools (`xcode-select --install`).
- Linux: WebKitGTK 4.1, GTK 3, librsvg, OpenSSL, libxdo, C/C++ build tools and patchelf. The desktop workflow lists the required Ubuntu packages.

From the repository, in cmd.exe or a shell:

```sh
npm ci
npm run desktop:info
npm run desktop:dev
```

`desktop:dev` builds the frontend/backend and prepares the sidecar before opening the window. Use `npm run dev` in the browser for hot reload.

Close any `npm start` backend before starting desktop mode. Port 3000 is reserved for the backend and OAuth callback; Tauri refuses to attach to another service already using it. After installing Rust, restart your terminal so Cargo is on PATH. For Git Bash, add the Cargo bin directory to that shell's PATH using its startup configuration if necessary.

## Bundled backend and data

`scripts/prepare-desktop.mjs` copies the build machine's Node runtime into `src-tauri/binaries/osumosis-node-<target>` and installs production dependencies for the same OS/CPU in `.desktop/backend`. The frontend, workers and native modules are bundled as resources. Unused Realm mobile libraries and the WiX-incompatible `@fastify/send/test` fixtures are removed only from this staged copy.

Preparation needs npm/GitHub/`static.realm.io` access and the same Node runtime used by the installed native modules. The runtime license is retained; retrieving it may also require `raw.githubusercontent.com` when no local Node LICENSE is available. Development lifecycle hooks are omitted from the staged manifest while dependency install scripts remain enabled. End users will not need to install Node/npm. Cross-compiling native modules is unsupported; build each OS on a matching runner.

Rust starts the backend, waits for its instance-specific readiness marker and opens `http://127.0.0.1:3000`. Shell commands are not exposed to the frontend. UI permissions only allow approved osu!/GitHub/tosu links to open through the system.

Desktop data uses Tauri's `app_data_dir` for `io.github.debuzzz.osumosis`, separate from the repository's `.data`. Configure your osu! paths at first launch. To reuse an existing catalogue, stop both services and copy `.data` contents into the desktop application data directory. The resolved path is logged at startup in `desktop-backend.log`.

Backend output goes to rotating `desktop-backend.log`; capture diagnostics remain in `tosu.log`. Closing the window requests local backend shutdown and terminates the sidecar if needed.

## Build an installer

```sh
npm run desktop:build
```

Installers are written to `src-tauri/target/release/bundle`. `Cargo.lock` is tracked and its application entry is kept in sync with the npm version. Validate the window, installer and real-game integrations on the target OS.

## Releases

`.github/workflows/desktop.yml` supports manual artifact builds for Windows/macOS/Linux. A published `v*` tag creates a **draft GitHub Release** with notes from `CHANGELOG.md`. Use the [release commands](CONTRIBUTING.md#prepare-a-version) to synchronize npm, Tauri, Cargo and the displayed version before pushing a release tag.

For a PR containing a version bump, push the branch without publishing a release tag, merge it, then tag the accepted release commit. Inspect and test the generated installers before publishing the draft. Windows signing, macOS notarization and automatic updates are still planned; current builds are for testing.
