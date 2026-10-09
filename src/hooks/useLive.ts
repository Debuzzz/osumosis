import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { LiveState } from "../../shared/types";
import { t } from "../lib/i18n";

export function useLive() {
  const [live, setLive] = useState<LiveState>({
    connected: false,
    state: t("Offline"),
    client: "",
    paused: false,
    map: null,
    play: null,
  });
  const queryClient = useQueryClient();
  useEffect(() => {
    let socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout>,
      closed = false;
    const connect = () => {
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      );
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "live") setLive(message.data);
        if (message.type === "account-changed")
          void queryClient.invalidateQueries({ queryKey: ["account"] });
        if (message.type === "tosu-diagnostic") {
          void queryClient.invalidateQueries({ queryKey: ["tosu-diagnostics"] });
        }
        if (message.type === "index" || message.type === "play-saved") {
          void queryClient.invalidateQueries({ queryKey: ["status"] });
          if (message.type === "play-saved" || !message.data.running) {
            void queryClient.invalidateQueries({ queryKey: ["maps"] });
            void queryClient.invalidateQueries({ queryKey: ["collections"] });
            void queryClient.invalidateQueries({ queryKey: ["plays"] });
            void queryClient.invalidateQueries({ queryKey: ["detail"] });
            void queryClient.invalidateQueries({ queryKey: ["performance-map"] });
          }
        }
      };
      socket.onclose = () => {
        if (!closed) {
          setLive((previous) => ({
            ...previous,
            connected: false,
            state: "Connexion au service interrompue",
          }));
          retry = setTimeout(connect, 3000);
        }
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [queryClient]);
  return live;
}
