import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import en from "../src/locales/en.json";
import fr from "../src/locales/fr.json";

const root = path.resolve(import.meta.dirname, "..");
const i18nUrl = new URL("../src/lib/i18n.ts", import.meta.url).href;

// Separate processes exercise startup preferences without reinitializing i18next's singleton.
function runBrowserScript(script: string) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", script],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 15_000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("startup uses English unless a supported language preference was saved", () => {
  for (const [saved, unavailable, expected] of [
    [null, false, "en"],
    ["de", false, "en"],
    ["fr", true, "en"],
    ["fr", false, "fr"],
  ] as const) {
    runBrowserScript(`
      import assert from "node:assert/strict";
      globalThis.document = { documentElement: { lang: "" } };
      globalThis.localStorage = {
        getItem(key) {
          assert.equal(key, "osumosis.language");
          if (${unavailable}) throw new Error("Storage unavailable");
          return ${JSON.stringify(saved)};
        }
      };
      const { default: i18n, locale, t } = await import(${JSON.stringify(i18nUrl)});
      assert.equal(i18n.language, ${JSON.stringify(expected)});
      assert.equal(document.documentElement.lang, ${JSON.stringify(expected)});
      assert.equal(locale(), ${JSON.stringify(expected === "fr" ? "fr-FR" : "en-US")});
      assert.equal(t("Settings"), ${JSON.stringify(expected === "fr" ? "Réglages" : "Settings")});
    `);
  }
});

test("switching preserves preference, document language, fallback and plural interpolation", () => {
  runBrowserScript(`
    import assert from "node:assert/strict";
    let unavailable = false;
    const storage = new Map();
    globalThis.document = { documentElement: { lang: "" } };
    globalThis.localStorage = {
      getItem: (key) => storage.get(key) ?? null,
      setItem(key, value) {
        if (unavailable) throw new Error("Storage unavailable");
        storage.set(key, value);
      }
    };
    const { default: i18n, locale, setLanguage, t } = await import(${JSON.stringify(i18nUrl)});
    assert.equal(t("{{count}} seconds", { count: 1 }), "1 second");
    assert.equal(t("{{count}} seconds", { count: 2 }), "2 seconds");
    await setLanguage("fr");
    assert.equal(storage.get("osumosis.language"), "fr");
    assert.equal(document.documentElement.lang, "fr");
    assert.equal(locale(), "fr-FR");
    assert.equal(t("{{count}} seconds", { count: 1 }), "1 seconde");
    assert.equal(t("{{count}} seconds", { count: 2 }), "2 secondes");
    assert.equal(t("osu! account: {{name}}", { name: "player" }), "Compte osu! : player");
    i18n.addResource("en", "translation", "Only in English", "English fallback");
    assert.equal(t("Only in English"), "English fallback");
    await setLanguage("unsupported");
    assert.equal(i18n.language, "fr");
    assert.equal(storage.get("osumosis.language"), "fr");
    unavailable = true;
    await setLanguage("en");
    assert.equal(t("Settings"), "Settings");
    assert.equal(document.documentElement.lang, "en");
    assert.equal(locale(), "en-US");
  `);
});

test("French resources match English keys and interpolation placeholders", () => {
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  const placeholders = (text: string) =>
    [...text.matchAll(/{{\s*([^}]+)\s*}}/g)].map((m) => m[1]).sort();
  for (const [key, value] of Object.entries(en)) {
    if (!/_(one|other)$/.test(key)) assert.equal(key, value, `English source key: ${key}`);
    const translation = fr[key as keyof typeof fr];
    assert.ok(translation.trim(), `Missing French text: ${key}`);
    assert.deepEqual(placeholders(translation), placeholders(value), `Interpolation: ${key}`);
  }
});

test("literal UI translation calls have canonical English resource keys", async () => {
  async function checkDirectory(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await checkDirectory(file);
      else if (/\.tsx?$/.test(file)) {
        const source = ts.createSourceFile(
          file,
          await readFile(file, "utf8"),
          ts.ScriptTarget.Latest,
          true,
        );
        function visit(node: ts.Node) {
          if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === "t"
          ) {
            const key = node.arguments[0];
            if (key && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key))) {
              assert.ok(Object.hasOwn(en, key.text), `${path.relative(root, file)}: ${key.text}`);
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }
  await checkDirectory(path.join(root, "src"));
});
