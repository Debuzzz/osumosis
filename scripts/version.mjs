import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const options = process.argv.slice(2);
const allowed = ["--sync", "--stage", "--release-notes"];
if (options.some((option) => !allowed.includes(option))) throw new Error("Unknown version option.");
if (
  (options.includes("--stage") || options.includes("--release-notes")) &&
  !options.includes("--sync")
)
  throw new Error("--stage and --release-notes require --sync.");

const read = (file) => readFile(path.join(root, file), "utf8");
const [manifest, lockText, tauriText, cargoText, cargoLock] = await Promise.all(
  [
    "package.json",
    "package-lock.json",
    "src-tauri/tauri.conf.json",
    "src-tauri/Cargo.toml",
    "src-tauri/Cargo.lock",
  ].map(read),
);
const { version } = JSON.parse(manifest);
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
  throw new Error("Desktop releases require a stable version: major.minor.patch.");
const lock = JSON.parse(lockText);
const cargoPackage = /(^\[package\]\r?\n(?:(?!^\[)[\s\S])*?^version[ \t]*=[ \t]*")([^"]+)(")/m;
const cargoLockedPackage =
  /(^\[\[package\]\]\s*\r?\nname = "osumosis-desktop"\s*\r?\nversion = ")([^"]+)(")/m;
const checks = [
  ["package-lock.json", lock.version],
  ["package-lock.json packages[root]", lock.packages?.[""]?.version],
  ["src-tauri/tauri.conf.json", JSON.parse(tauriText).version],
  ["src-tauri/Cargo.toml", cargoText.match(cargoPackage)?.[2]],
  ["src-tauri/Cargo.lock", cargoLock.match(cargoLockedPackage)?.[2]],
];
if (options.includes("--sync")) {
  // npm owns both package versions; synchronize only the desktop metadata.
  for (const [file, actual] of checks.slice(0, 2))
    if (actual !== version)
      throw new Error(`${file} differs from package.json; run npm install --package-lock-only.`);
  if (checks.slice(2).some(([, actual]) => actual === undefined))
    throw new Error("Desktop version metadata is missing; no files were changed.");
  const changes = new Map([
    [
      "src-tauri/tauri.conf.json",
      tauriText.replace(
        /("version"\s*:\s*")([^"]+)(")/,
        (_match, prefix, _old, suffix) => prefix + version + suffix,
      ),
    ],
    [
      "src-tauri/Cargo.toml",
      cargoText.replace(cargoPackage, (_match, prefix, _old, suffix) => prefix + version + suffix),
    ],
    [
      "src-tauri/Cargo.lock",
      cargoLock.replace(
        cargoLockedPackage,
        (_match, prefix, _old, suffix) => prefix + version + suffix,
      ),
    ],
  ]);
  if (options.includes("--release-notes")) {
    const changelog = await read("CHANGELOG.md");
    if (changelog.includes(`## [${version}]`))
      throw new Error(`Release notes for ${version} already exist.`);
    const unreleased = /^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m;
    const notes = changelog.match(unreleased);
    if (!notes || !/^\s*-\s+\S/m.test(notes[1]))
      throw new Error("Add release notes under CHANGELOG.md [Unreleased] before changing version.");
    const date = new Date().toISOString().slice(0, 10);
    changes.set(
      "CHANGELOG.md",
      changelog.replace(
        unreleased,
        () => `## [Unreleased]\n\n## [${version}] - ${date}\n${notes[1]}`,
      ),
    );
  }
  for (const [file, contents] of changes) await writeFile(path.join(root, file), contents);
  if (options.includes("--stage") && process.env.npm_config_git_tag_version !== "false") {
    const result = spawnSync("git", ["add", "--", ...changes.keys()], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Unable to stage version files.");
  }
  console.log(`Desktop metadata synchronized to ${version}.`);
} else {
  const mismatches = checks.filter(([, actual]) => actual !== version);
  if (mismatches.length)
    throw new Error(
      `Version mismatch (expected ${version}): ${mismatches.map(([file, actual]) => `${file}=${actual ?? "missing"}`).join(", ")}. Run npm run version:sync.`,
    );
  if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME !== `v${version}`)
    throw new Error(`Tag ${process.env.GITHUB_REF_NAME} does not match v${version}.`);
  console.log(`Versions checked: npm, lockfiles and Tauri ${version}.`);
}
