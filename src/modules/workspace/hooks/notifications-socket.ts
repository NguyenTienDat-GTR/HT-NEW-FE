"use client";

import { Client } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { clientEnv } from "@/lib/env";
import { apiFetch, refreshAccessToken } from "@/lib/api/client";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { notificationKeys } from "@/modules/notifications/hooks";

export function useNotificationsSocket() {
  const queryClient = useQueryClient();
  const router = useRouter();
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
          void queryClient.invalidateQueries({ queryKey: ["system", "notifications"] });
          void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
        });
        client.subscribe("/user/queue/auth-events", () => {
          void refreshAccessToken().then(async (nextToken) => {
            if (!nextToken) {
              useAuthStore.getState().clear();
              return;
            }
            const user = await apiFetch<AuthUser>("/auth/me");
            useAuthStore.getState().setUser(user);
            await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
            await queryClient.invalidateQueries({ queryKey: ["resource"] });
            router.refresh();
          });
        });
        void queryClient.invalidateQueries({ queryKey: ["resource", "/system/notifications"] });
        void queryClient.invalidateQueries({ queryKey: ["system", "notifications"] });
        void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      },
    });
    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [queryClient, router, token]);
}
