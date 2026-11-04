"use client";

import { Client } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resolveWsUrl } from "@/lib/env";
import { apiFetch, refreshAccessToken } from "@/lib/api/client";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { notificationKeys } from "@/modules/notifications/hooks";
import { resourceKey, invalidateDataQueries } from "@/lib/api/query-keys";

export function useNotificationsSocket() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!token) return;
    const client = new Client({
      brokerURL: resolveWsUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        client.connectHeaders = { Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ""}` };
      },
      onConnect: () => {
        client.subscribe("/user/queue/notifications", () => {
          // Sự kiện đóng/mở đăng ký từ RabbitMQ: cập nhật luôn trạng thái trong danh sách khóa.
          // Mỗi thông báo đi kèm một thay đổi dữ liệu đã commit (tự duyệt hồ sơ, duyệt / từ chối, mở / đóng đăng ký,
          // chuyển giáo xứ...), kể cả thay đổi do tác vụ nền: làm mới các màn dữ liệu đang mở để không hiện bản cũ.
          void invalidateDataQueries(queryClient);
          void queryClient.invalidateQueries({ queryKey: resourceKey("/system/notifications") });
          void queryClient.invalidateQueries({ queryKey: ["system", "notifications"] });
          void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
        });
        // Chứng nhận đổi (chấm điểm, tạo, sửa, duyệt, thu hồi, kết thúc khóa): tải lại màn chứng nhận, tab duyệt chứng nhận,
        // bảng chấm điểm, chi tiết khóa và trang huynh trưởng đang mở.
        client.subscribe("/topic/certificate-events", () => {
          void invalidateDataQueries(queryClient);
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
            await queryClient.invalidateQueries({ queryKey: resourceKey() });
            router.refresh();
          });
        });
        void queryClient.invalidateQueries({ queryKey: resourceKey("/system/notifications") });
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

