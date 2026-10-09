import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Hooks belong to a development checkout, not CI or the staged production backend.
if (
  !process.env.CI &&
  process.env.NODE_ENV !== "production" &&
  existsSync(fileURLToPath(new URL("../.git", import.meta.url)))
) {
  const { default: husky } = await import("husky");
  const result = husky();
  if (result) throw new Error(result);
}
