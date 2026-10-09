import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? filesIn(file) : /\.(ts|tsx|mjs)$/.test(file) ? [file] : [];
    }),
  );
  return nested.flat();
}
const files = (
  await Promise.all(
    ["src", "server", "shared"].map((directory) => filesIn(path.join(root, directory))),
  )
).flat();
const known = new Set(files);
const graph = new Map();
const errors = [];
const label = (file) => path.relative(root, file).split(path.sep).join("/");
const layer = (file) => label(file).split("/")[0];

for (const file of files) {
  const text = await readFile(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const dependencies = [];
  function visit(node) {
    let specifier,
      runtime = true;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
      runtime = !node.isTypeOnly && !node.importClause?.isTypeOnly;
      const bindings = node.importClause?.namedBindings || node.exportClause;
      if (
        bindings &&
        "elements" in bindings &&
        bindings.elements.length &&
        bindings.elements.every((element) => element.isTypeOnly)
      )
        runtime = false;
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      specifier = node.arguments[0];
    }
    if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith(".")) {
      const base = path.resolve(path.dirname(file), specifier.text);
      const target = [base, ...[".ts", ".tsx", ".mjs"].map((ext) => base + ext)].find((candidate) =>
        known.has(candidate),
      );
      if (target) {
        const from = layer(file),
          to = layer(target);
        if (
          (from === "src" && to === "server") ||
          (from === "server" && to === "src") ||
          (from === "shared" && to !== "shared")
        )
          errors.push(`${label(file)} imports ${label(target)} across an application boundary.`);
        if (runtime) dependencies.push(target);
        if (
          runtime &&
          /^server\/features\//.test(label(file)) &&
          /^server\/(core|app\.ts|index\.ts)/.test(label(target))
        ) {
          if (!label(target).endsWith("api-error.ts"))
            errors.push(`${label(file)} depends on application composition ${label(target)}.`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  graph.set(file, dependencies);
}
const complete = new Set(),
  active = new Set();
function walk(file, chain = []) {
  if (active.has(file)) {
    errors.push(`Runtime import cycle: ${[...chain, file].map(label).join(" -> ")}`);
    return;
  }
  if (complete.has(file)) return;
  active.add(file);
  for (const dependency of graph.get(file) || []) walk(dependency, [...chain, file]);
  active.delete(file);
  complete.add(file);
}
for (const file of files) walk(file);
if (errors.length) {
  console.error([...new Set(errors)].join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Architecture checked: ${files.length} modules, no forbidden imports or runtime cycles.`,
  );
