import { appendFile, rename, rm, stat } from "node:fs/promises";
import type { TosuDiagnostic } from "../../../shared/types";

/** Lifecycle events only; no websocket payloads, account names, paths or OAuth configuration. */
export class TelemetryLog {
  private queue = Promise.resolve();
  constructor(private file: string) {}
  write(entry: TosuDiagnostic) {
    const line = JSON.stringify(entry) + "\n";
    (entry.level === "error"
      ? console.error
      : entry.level === "warn"
        ? console.warn
        : console.info)(`tosu · ${entry.event} · ${entry.message}`);
    this.queue = this.queue
      .then(async () => {
        const info = await stat(this.file).catch(() => null);
        if (info && info.size + Buffer.byteLength(line) > 512 * 1024) {
          await rm(this.file + ".1", { force: true });
          await rename(this.file, this.file + ".1");
        }
        await appendFile(this.file, line, { mode: 0o600 });
      })
      .catch((error) => console.error("Journal tosu :", (error as Error).message));
  }
  async close() {
    await this.queue;
  }
}
