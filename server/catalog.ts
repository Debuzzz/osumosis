import { Worker } from "node:worker_threads";
import { EventEmitter } from "node:events";

export class Catalog extends EventEmitter {
  private worker: Worker;
  private id = 0;
  private pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  readonly ready: Promise<void>;
  constructor(dataDir: string) {
    super();
    const development = import.meta.url.endsWith(".ts");
    this.worker = new Worker(
      development ? new URL("./dev-worker.mjs", import.meta.url) : new URL("./catalog-worker.js", import.meta.url),
      {
        workerData: {
          dataDir,
          ...(development ? { entry: new URL("./catalog-worker.ts", import.meta.url).href } : {}),
        },
      },
    );
    this.ready = new Promise((resolve, reject) => {
      this.worker.on("message", (message) => {
        if (message.event === "ready") {
          resolve();
          return;
        }
        if (message.event) {
          this.emit(message.event, message.data);
          return;
        }
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error));
        else pending.resolve(message.result);
      });
      this.worker.on("error", (error) => {
        reject(error);
        for (const p of this.pending.values()) p.reject(error);
        this.pending.clear();
        this.emit("failure", error);
      });
      this.worker.on("exit", (code) => {
        if (code) {
          const error = new Error(`Worker catalogue arrêté (${code}).`);
          reject(error);
          for (const p of this.pending.values()) p.reject(error);
          this.pending.clear();
        }
      });
    });
  }
  async call<T = any>(method: string, input?: unknown): Promise<T> {
    await this.ready;
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, method, input });
    });
  }
  async close() {
    await this.worker.terminate();
  }
}
