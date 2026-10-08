import { Catalog } from "./catalog";
import { dataDir, loadSettings } from "./config";
import path from "node:path";
import { selectedLibrary } from "./settings";

const settings = await loadSettings();
const args = process.argv.slice(2);
if (args[0] === "--client") {
  const client = args[1];
  if (client !== "stable" && client !== "lazer")
    throw new Error("Utiliser --client stable ou --client lazer.");
  settings.client = client;
  args.splice(0, 2);
}
if (args.length > 1) throw new Error("Usage : npm run index -- [--client stable|lazer] [dossier]");
if (args[0]) {
  settings.libraries[settings.client].osuPath = path.resolve(args[0]);
  if (settings.client === "stable") settings.libraries.stable.songsPath = "";
}
const catalog = new Catalog(dataDir);
try {
  await catalog.ready;
  await new Promise<void>((resolve, reject) => {
    catalog.on("index", (job) => {
      console.log(`[${job.phase}] ${job.processed} maps · ${job.message}`);
      if (job.phase === "error") reject(new Error(job.message));
      else if (job.phase === "done") resolve();
    });
    void catalog.call("index", selectedLibrary(settings)).catch(reject);
  });
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await catalog.close();
}
