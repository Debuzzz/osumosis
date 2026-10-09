import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const choices = ["patch", "minor", "major"];
const next = (type) => {
  const parts = version.split(".").map(Number);
  const position = choices.indexOf(type);
  const index = 2 - position;
  parts[index]++;
  return parts.map((part, i) => (i > index ? 0 : part)).join(".");
};
let [type, ...extra] = process.argv.slice(2);
if (extra.length) throw new Error("Usage: npm run release -- patch|minor|major");
if (!type) {
  if (process.env.CI || !process.stdin.isTTY)
    throw new Error(
      "An interactive terminal is required. Otherwise use: npm run release -- patch|minor|major",
    );
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`\nVersion actuelle : ${version}`);
    console.log(choices.map((choice) => `  ${choice.padEnd(5)} → ${next(choice)}`).join("\n"));
    console.log("Entrée vide : annuler.");
    type = (await input.question("Type de release (patch/minor/major) : ")).trim().toLowerCase();
  } finally {
    input.close();
  }
  if (!type) {
    console.log("Release annulée.");
    process.exit(0);
  }
}
if (!choices.includes(type)) throw new Error("Choose patch, minor or major.");
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this command through npm: npm run release.");
const result = spawnSync(
  process.execPath,
  [
    npm,
    "version",
    type,
    "--git-tag-version",
    "--commit-hooks",
    "--ignore-scripts=false",
    "--message",
    "chore(release): v%s",
  ],
  {
    cwd: root,
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`\nRelease v${next(type)} préparée : commit et tag locaux créés.`);
console.log("Publication : git push origin HEAD --follow-tags");
