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

export function useNotifications(params: BaseSearchParams = {}) {
  const queryString = serializeBaseSearch(params).toString();
  return useQuery({
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
