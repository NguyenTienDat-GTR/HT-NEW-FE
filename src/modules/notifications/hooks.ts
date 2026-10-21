"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { PageResponse } from "@/lib/api/client";
import { serializeBaseSearch, type BaseSearchParams } from "@/lib/api/search";

export type NotificationItem = {
  id: string;
  eventType?: string | null;
  title?: string | null;
  message?: string | null;
  senderUnitType?: "DIOCESE" | "DEANERY" | "PARISH" | null;
  senderUnitId?: string | null;
  courseCode?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
  status?: boolean | null;
};

export type UnreadNotificationCount = {
  unreadCount: number;
};

export const notificationKeys = {
  list: (params?: BaseSearchParams) => ["system", "notifications", params ?? {}] as const,
  unreadCount: ["system", "notifications", "unread-count"] as const,
};

export function useNotifications(params: BaseSearchParams = {}, options: { enabled?: boolean } = {}) {
  const queryString = serializeBaseSearch(params).toString();
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: notificationKeys.list(params),
    queryFn: () => apiFetch<PageResponse<NotificationItem>>(`/system/notifications?${queryString}`),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => apiFetch<UnreadNotificationCount>("/system/notifications/unread-count"),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<NotificationItem>(`/system/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["system", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      void queryClient.invalidateQueries({ queryKey: ["resource", "/system/notifications"] });
    },
  });
}

/** BE chưa có endpoint "đọc tất cả": đánh dấu lần lượt các thông báo chưa đọc đang hiển thị (theo lô nhỏ để tránh giới hạn tần suất). */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (let index = 0; index < ids.length; index += 4) {
        await Promise.all(ids.slice(index, index + 4).map((id) => apiFetch<NotificationItem>(`/system/notifications/${id}/read`, { method: "PATCH" })));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["system", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      void queryClient.invalidateQueries({ queryKey: ["resource", "/system/notifications"] });
    },
  });
}
