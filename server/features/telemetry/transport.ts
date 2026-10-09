import WebSocket from "ws";
import type { TosuPayload } from "./model";
interface Handlers {
  connected(): void;
  packet(raw: TosuPayload): void;
  invalid(error: unknown): void;
  error(): void;
  disconnected(): void;
  statusConnected(): void;
  status(number: number): void;
  statusUnavailable(): void;
}
/** Own sockets and reconnection timers; capture policy lives in the service. */
export function createTosuTransport(url: string, handlers: Handlers) {
  let closed = false,
    socket: WebSocket | undefined,
    statusSocket: WebSocket | undefined;
  let retry: NodeJS.Timeout | undefined, statusRetry: NodeJS.Timeout | undefined;
  const open = () => {
    if (closed) return;
    socket = new WebSocket(url, { maxPayload: 4 * 1024 * 1024 });
    socket.on("open", () => handlers.connected());
    socket.on("message", (bytes) => {
      if (closed) return;
      try {
        const raw = JSON.parse(bytes.toString()) as TosuPayload;
        if (!raw.beatmap || !raw.state) throw new Error("Flux v2 attendu : beatmap/state absents.");
        handlers.packet(raw);
      } catch (error) {
        handlers.invalid(error);
      }
    });
    socket.on("error", () => handlers.error());
    socket.on("close", () => {
      if (closed) return;
      handlers.disconnected();
      retry = setTimeout(open, 5000);
      retry.unref();
    });
  };
  const statusUrl = new URL(url);
  statusUrl.pathname = "/tokens";
  const openStatus = () => {
    if (closed) return;
    const status = (statusSocket = new WebSocket(statusUrl, { maxPayload: 4 * 1024 * 1024 }));
    status.on("open", () => {
      status.send('applyFilters:["status"]');
      handlers.statusConnected();
    });
    status.on("message", (bytes) => {
      if (closed) return;
      try {
        const raw = JSON.parse(bytes.toString());
        const number = Number(raw.status);
        if (Number.isFinite(number) && raw.status !== undefined) handlers.status(number);
      } catch {
        /* The v2 feed remains usable without the auxiliary status feed. */
      }
    });
    status.on("error", () => {});
    status.on("close", () => {
      if (closed) return;
      handlers.statusUnavailable();
      statusRetry = setTimeout(openStatus, 5000);
      statusRetry.unref();
    });
  };
  open();
  openStatus();
  return {
    get statusConnected() {
      return statusSocket?.readyState === WebSocket.OPEN;
    },
    close() {
      closed = true;
      if (retry) clearTimeout(retry);
      if (statusRetry) clearTimeout(statusRetry);
      for (const current of [socket, statusSocket])
        if (current) {
          current.removeAllListeners();
          current.on("error", () => {});
          current.close();
        }
    },
  };
}
