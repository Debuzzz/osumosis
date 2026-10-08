import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  stat,
  unlink,
  utimes,
} from "node:fs/promises";
import path from "node:path";

const limit = 256 * 1024 * 1024;
export class Covers {
  private root: string;
  private pending = new Map<string, Promise<{ file: string; mime: string }>>();
  private failureUntil = new Map<string, number>();
  private lastFetch = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private pruning = false;
  constructor(dataDir: string) {
    this.root = path.join(dataDir, "covers");
  }
  async get(url: string, allowFetch: boolean) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "assets.ppy.sh")
      throw new Error("Source de miniature non prise en charge.");
    const key = createHash("sha256").update(url).digest("hex");
    const file = path.join(this.root, key + ".bin"),
      meta = path.join(this.root, key + ".json");
    await mkdir(this.root, { recursive: true });
    try {
      const info = JSON.parse(await readFile(meta, "utf8"));
      await stat(file);
      await utimes(file, new Date(), new Date());
      return { file, mime: String(info.mime) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (!allowFetch) throw new Error("Miniature absente du cache.");
    if ((this.failureUntil.get(key) || 0) > Date.now())
      throw new Error("Miniature temporairement indisponible.");
    if (this.pending.has(key)) return this.pending.get(key)!;
    if (this.pending.size >= 60) throw new Error("File de miniatures pleine.");
    const task = this.tail
      .catch(() => {})
      .then(async () => {
        const wait = Math.max(0, this.lastFetch + 500 - Date.now());
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
        this.lastFetch = Date.now();
        const response = await fetch(url, {
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        });
        const mime = response.headers.get("content-type")?.split(";")[0] || "";
        if (
          !response.ok ||
          !["image/jpeg", "image/png", "image/webp"].includes(mime) ||
          !response.body
        )
          throw new Error("Miniature indisponible.");
        const reader = response.body.getReader(),
          chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 2 * 1024 * 1024) {
              await reader.cancel();
              throw new Error("Miniature trop volumineuse.");
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        await writeFile(file + ".tmp", Buffer.concat(chunks));
        await rename(file + ".tmp", file);
        await writeFile(meta, JSON.stringify({ mime }));
        void this.prune();
        return { file, mime };
      })
      .catch((error) => {
        this.failureUntil.set(key, Date.now() + 60000);
        throw error;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    this.tail = task.catch(() => {});
    return task;
  }
  private async prune() {
    if (this.pruning) return;
    this.pruning = true;
    try {
      const files = (await readdir(this.root)).filter((name) => /^[a-f0-9]{64}\.bin$/.test(name));
      const entries: { name: string; size: number; time: number }[] = [];
      for (const name of files) {
        const info = await stat(path.join(this.root, name));
        entries.push({ name, size: info.size, time: info.mtimeMs });
      }
      let size = entries.reduce((sum, entry) => sum + entry.size, 0);
      entries.sort((a, b) => a.time - b.time);
      for (const entry of entries) {
        if (size <= limit) break;
        await unlink(path.join(this.root, entry.name));
        await unlink(path.join(this.root, entry.name.replace(".bin", ".json"))).catch(() => {});
        size -= entry.size;
      }
    } catch {
      /* Cache eviction may retry after the next downloaded cover. */
    } finally {
      this.pruning = false;
    }
  }
}
