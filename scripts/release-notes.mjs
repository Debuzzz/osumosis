import { readFile, appendFile } from "node:fs/promises";

const text = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const version =
  process.env.GITHUB_REF_NAME?.replace(/^v/, "") ||
  process.argv.find((value) => /^\d+\.\d+\.\d+/.test(value));
const sections = [
  ...text.matchAll(/^## \[([^\]]+)\][^\n]*\n([\s\S]*?)(?=^## |^\[Unreleased\]:|$(?![\s\S]))/gm),
];
const notes =
  sections.find((section) => section[1] === version)?.[2].trim() ||
  sections.find((section) => section[1] === "Unreleased")?.[2].trim();
if (!notes) throw new Error("No release notes found in CHANGELOG.md.");
if (process.argv.includes("--github")) {
  if (!process.env.GITHUB_ENV) throw new Error("GITHUB_ENV is required for --github.");
  await appendFile(
    process.env.GITHUB_ENV,
    `OSUMOSIS_RELEASE_NOTES<<OSUMOSIS_NOTES_END\n${notes}\nOSUMOSIS_NOTES_END\n`,
  );
} else console.log(notes);
