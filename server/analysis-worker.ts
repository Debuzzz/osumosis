import { parentPort, workerData } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import * as rosu from "rosu-pp-js";

try {
  const bytes = await readFile(workerData.file);
  const map = new rosu.Beatmap(bytes);
  try {
    if (map.isSuspicious()) throw new Error("Map trop complexe pour une analyse sûre.");
    const mods = workerData.mods === "NM" ? 0 : workerData.mods;
    const lazer = workerData.client === "lazer";
    const difficulty = new rosu.Difficulty({ mods, lazer });
    try {
      const attrs = difficulty.calculate(map);
      const strain = difficulty.strains(map) as any;
      const pp: { accuracy: number; pp: number }[] = [];
      for (const accuracy of [95, 97, 98, 99, 100]) {
        const performance = new rosu.Performance({ mods, accuracy, lazer });
        try {
          const result = performance.calculate(attrs);
          try {
            pp.push({ accuracy, pp: result.pp });
          } finally {
            result.free();
          }
        } finally {
          performance.free();
        }
      }
      const aim = strain.aim,
        speed = strain.speed;
      const general = strain.strains ?? strain.movement ?? strain.stamina;
      const arrays = [aim || [], speed || [], general || []];
      const count = Math.max(...arrays.map((a) => a.length));
      const strains = Array.from({ length: count }, (_, i) => ({
        time: (i + 1) * (strain.sectionLength || 400),
        aim: aim?.[i],
        speed: speed?.[i],
        strain: general?.[i],
      }));
      parentPort!.postMessage({
        result: {
          checksum: workerData.checksum,
          mods: workerData.mods,
          client: workerData.client,
          engine: `rosu-pp-js 4 / ${workerData.client}`,
          stars: attrs.stars,
          maxCombo: attrs.maxCombo,
          pp,
          strains,
        },
      });
      attrs.free();
      strain.free?.();
    } finally {
      difficulty.free();
    }
  } finally {
    map.free();
  }
} catch (error) {
  parentPort!.postMessage({ error: (error as Error).message });
}
