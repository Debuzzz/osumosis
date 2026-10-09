import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type WebSocket from "ws";
import type { AppServices } from "../core/services";
export class RealtimeHub {
  private sockets = new Set<WebSocket>();
  broadcast = (type: string, data: unknown) => {
    const message = JSON.stringify({ type, data });
    for (const socket of this.sockets)
      if (socket.readyState === 1 && socket.bufferedAmount < 1024 * 1024) socket.send(message);
  };
  async register(
    app: FastifyInstance,
    services: Pick<AppServices, "tosu" | "catalog" | "telemetryLog">,
  ) {
    const { tosu, catalog, telemetryLog } = services;
    await app.register(websocket, { options: { maxPayload: 16384 } });
    app.get("/ws", { websocket: true }, (socket) => {
      this.sockets.add(socket);
      socket.send(JSON.stringify({ type: "live", data: tosu.live }));
      socket.on("close", () => this.sockets.delete(socket));
      socket.on("error", () => this.sockets.delete(socket));
    });
    let broadcastTime = 0;
    tosu.on("live", (live) => {
      if (Date.now() - broadcastTime > 100) {
        this.broadcast("live", live);
        broadcastTime = Date.now();
      }
    });
    tosu.on("saved", (id) => this.broadcast("play-saved", id));
    tosu.on("diagnostic", (entry) => {
      telemetryLog.write(entry);
      this.broadcast("tosu-diagnostic", entry);
    });
    catalog.on("index", (data) => this.broadcast("index", data));
    catalog.on("failure", (error) => console.error("Catalogue :", error.message));
  }
  close() {
    for (const socket of this.sockets) socket.close();
    this.sockets.clear();
  }
}
