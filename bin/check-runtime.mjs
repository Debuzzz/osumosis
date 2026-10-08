const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error("Node.js >=22.12.0 requis.");
  process.exit(1);
}
let failed = false;
for (const name of ["better-sqlite3", "rosu-pp-js", "realm"]) {
  try {
    const dependency = await import(name);
    if (name === "better-sqlite3") {
      const db = new dependency.default(":memory:");
      db.prepare("SELECT 1").get();
      db.close();
    }
    if (name === "realm") dependency.default.shutdown();
    console.log(`${name} : disponible`);
  } catch {
    failed = true;
    console.error(
      name === "realm"
        ? "Realm indisponible : autoriser https://static.realm.io pour les téléchargements, puis lancer npm rebuild realm. La lecture lazer nécessite ce module natif."
        : `${name} indisponible : relancer npm ci avec un Node compatible.`,
    );
  }
}
process.exitCode = failed ? 1 : 0;
