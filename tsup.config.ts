import { defineConfig } from "tsup";
export default defineConfig({
  entry: {
    index: "server/index.ts",
    "catalog-worker": "server/features/catalog/worker.ts",
    "analysis-worker": "server/features/analysis/worker.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist/server",
  clean: true,
  external: ["better-sqlite3", "rosu-pp-js", "realm"],
});
