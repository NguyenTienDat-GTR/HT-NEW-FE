"use client";

import { Bell, CheckCircle, Circle, ClockCounterClockwise } from "@phosphor-icons/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { ResourcePagination } from "@/components/common/resource/resource-pagination";
import type { ResourcePageSize } from "@/components/common/resource/use-resource-query-state";
import { useMarkNotificationRead, useNotifications, type NotificationItem } from "@/modules/notifications/hooks";

export function NotificationInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const size = parsePageSize(searchParams.get("size"));
  const notificationsQuery = useNotifications({ page, size });
  const markRead = useMarkNotificationRead();
  const notifications = notificationsQuery.data?.content ?? [];
  const pageData = notificationsQuery.data;

  function openNotification(item: NotificationItem) {
    if (!item.id || item.readAt || markRead.isPending) return;
    markRead.mutate(item.id);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-[0] text-foreground">Thông báo</h1>
        <p className="mt-2 max-w-[78ch] text-base text-muted">Theo dõi thay đổi quyền, vai trò, đơn vị và các sự kiện workflow được gửi tới tài khoản hiện tại.</p>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-primary/10 text-primary">
              <Bell className="h-5 w-5" weight="bold" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Inbox</h2>
              <p className="text-sm text-muted">{notifications.filter((item) => !item.readAt).length} thông báo chưa đọc</p>
            </div>
          </div>
        </div>

        {notificationsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="h-[92px] rounded-[10px] bg-surface-1 motion-safe:animate-pulse" key={index} />
            ))}
          </div>
        ) : null}

        {!notificationsQuery.isLoading && notifications.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center p-8 text-center">
            <div>
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[10px] bg-surface-1 text-muted">
                <ClockCounterClockwise className="h-6 w-6" />
              </span>
              <p className="font-semibold text-foreground">Chưa có thông báo</p>
              <p className="mt-1 text-sm text-muted">Các cập nhật liên quan đến tài khoản sẽ xuất hiện tại đây.</p>
            </div>
          </div>
        ) : null}

        <div className="divide-y divide-border">
          {notifications.map((item) => {
            const unread = !item.readAt;
            return (
              <button
                className={cn("flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-primary-soft", unread && "bg-primary/4")}
                key={item.id}
                onClick={() => openNotification(item)}
                type="button"
              >
                <span className={cn("mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-[10px]", unread ? "bg-primary/10 text-primary" : "bg-surface-1 text-muted")}>
                  {unread ? <Circle className="h-4 w-4" weight="fill" /> : <CheckCircle className="h-4 w-4" weight="bold" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{item.title ?? "Thông báo hệ thống"}</span>
                    <span className="rounded-[6px] border border-border bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0] text-muted">{item.eventType ?? "SYSTEM"}</span>
                    {unread ? <span className="rounded-[6px] bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">Chưa đọc</span> : null}
                  </span>
                  {item.message ? <span className="mt-1 block text-sm leading-6 text-muted">{item.message}</span> : null}
                  <span className="mt-2 block text-xs text-muted">{formatDateTime(item.createdAt)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <ResourcePagination
          data={pageData as never}
          page={page}
          size={size}
          updatePage={(nextPage) => updatePagination(router, searchParams, "page", String(nextPage + 1))}
          updatePageSize={(nextSize) => updatePagination(router, searchParams, "size", String(nextSize))}
        />
      </Panel>
    </div>
  );
}

function updatePagination(router: ReturnType<typeof useRouter>, searchParams: ReturnType<typeof useSearchParams>, key: "page" | "size", value: string) {
  const next = new URLSearchParams(searchParams);
  next.set(key, value);
  if (key === "size") next.set("page", "1");
  router.replace(`/notifications?${next.toString()}` as Route);
}

function parsePage(value: string | null) {
  const page = Number(value ?? 1);
  if (!Number.isInteger(page) || page < 1) return 0;
  return page - 1;
}

function parsePageSize(value: string | null): ResourcePageSize {
  const size = Number(value ?? 10);
  if (size === 20 || size === 50 || size === 100) return size;
  return 10;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Không rõ thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
