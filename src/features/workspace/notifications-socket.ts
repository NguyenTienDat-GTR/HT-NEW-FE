"use client";

import { Client } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { clientEnv } from "@/lib/env";
import { useAuthStore } from "@/lib/auth/auth-store";

export function useNotificationsSocket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!token) return;
    const client = new Client({
      brokerURL: clientEnv.NEXT_PUBLIC_WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        client.connectHeaders = { Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ""}` };
      },
      onConnect: () => {
        client.subscribe("/user/queue/notifications", () => {
          void queryClient.invalidateQueries({ queryKey: ["resource", "/system/notifications"] });
        });
        void queryClient.invalidateQueries({ queryKey: ["resource", "/system/notifications"] });
      },
    });
    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [queryClient, token]);
}
