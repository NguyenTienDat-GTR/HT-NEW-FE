"use client";

import { Bell, Certificate, Check, Checks, GraduationCap, MagnifyingGlass, ShieldCheck, TreeStructure, Tray } from "@phosphor-icons/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResourcePagination } from "@/components/common/resource/resource-pagination";
import type { ResourcePageSize } from "@/components/common/resource/use-resource-query-state";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatVietnamDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
  type NotificationItem,
} from "@/modules/notifications/hooks";
import { MY_PERMISSIONS_PATH, notificationDetail, notificationGroupOf, notificationGroups, notificationHref, relativeTime, type NotificationGroupKey } from "@/modules/notifications/notification-meta";
import { NotificationDetailModal } from "./notification-detail-modal";
import { useSessionState } from "@/lib/use-session-state";

type Filter = "all" | "unread" | NotificationGroupKey;

const groupIcons = {
  training: GraduationCap,
  certificate: Certificate,
  access: ShieldCheck,
  unit: TreeStructure,
  other: Bell,
} as const;

const groupLabels: Record<NotificationGroupKey, string> = {
  training: "Khóa huấn luyện",
  certificate: "Chứng chỉ",
  access: "Tài khoản & quyền",
  unit: "Đơn vị",
  other: "Khác",
};

export function NotificationInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const size = parsePageSize(searchParams.get("size"));
  const notificationsQuery = useNotifications({ page, size });
  const unreadCountQuery = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [filter, setFilter] = useSessionState<Filter>("notifications:filter", "all");
  const [keyword, setKeyword] = useSessionState("notifications:keyword", "");
  const notifications = useMemo(() => notificationsQuery.data?.content ?? [], [notificationsQuery.data]);
  const pageData = notificationsQuery.data;
  const unreadTotal = unreadCountQuery.data?.unreadCount ?? 0;

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: notifications.length, unread: 0, training: 0, certificate: 0, access: 0, unit: 0, other: 0 };
    for (const item of notifications) {
      if (!item.readAt) result.unread += 1;
      result[notificationGroupOf(item)] += 1;
    }
    return result;
  }, [notifications]);

  const visible = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return notifications.filter((item) => {
      if (filter === "unread" && item.readAt) return false;
      if (filter !== "all" && filter !== "unread" && notificationGroupOf(item) !== filter) return false;
      if (!text) return true;
      return `${item.title ?? ""} ${item.message ?? ""}`.toLowerCase().includes(text);
    });
  }, [filter, keyword, notifications]);

  const sections = useMemo(() => groupByDay(visible), [visible]);
  const unreadOnPage = notifications.filter((item) => !item.readAt).map((item) => item.id);

  const [detailItem, setDetailItem] = useState<NotificationItem | null>(null);

  function openNotification(item: NotificationItem) {
    if (!item.readAt && !markRead.isPending) markRead.mutate(item.id);
    // Thông báo gom nhóm / danh sách quyền: mở modal danh sách thay vì chuyển trang.
    if (notificationDetail(item)) {
      setDetailItem(item);
      return;
    }
    router.push(notificationHref(item) as Route);
  }

  function markAllRead() {
    if (unreadOnPage.length === 0 || markAll.isPending) return;
    markAll.mutate(unreadOnPage, {
      onSuccess: () => toast.success("Đã đánh dấu các thông báo trong trang là đã đọc"),
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  }

  const filterItems: { key: Filter; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "Tất cả", icon: Tray },
    { key: "unread", label: "Chưa đọc", icon: Bell },
    ...notificationGroups.map((group) => ({ key: group.key as Filter, label: group.label, icon: groupIcons[group.key] })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-8 tracking-[0] text-foreground">Trung tâm thông báo</h1>
          <p className="mt-1 max-w-[78ch] text-sm text-text-secondary">Theo dõi thay đổi quyền, vai trò, đơn vị và các sự kiện workflow được gửi tới tài khoản hiện tại.</p>
        </div>
        <Button disabled={unreadOnPage.length === 0 || markAll.isPending} loading={markAll.isPending} onClick={markAllRead} type="button" variant="outline">
          <Checks size={18} weight="bold" />
          Đánh dấu đã đọc trong trang
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Panel className="p-3 lg:sticky lg:top-24">
          <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Phân loại</p>
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" role="tablist" aria-label="Phân loại thông báo">
            {filterItems.map((item) => {
              const Icon = item.icon;
              const active = filter === item.key;
              return (
                <button
                  aria-selected={active}
                  className={cn(
                    "flex h-10 shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors",
                    active ? "bg-primary-soft font-semibold text-primary" : "text-text-secondary hover:bg-surface-hover hover:text-foreground",
                  )}
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  role="tab"
                  type="button"
                >
                  <Icon size={18} weight={active ? "fill" : "regular"} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", active ? "bg-white text-primary" : "bg-surface-2 text-text-secondary")}>{counts[item.key]}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 border-t border-border px-2 pt-3 text-xs leading-5 text-muted">
            Số liệu theo trang đang xem. Toàn hệ thống còn <span className="font-semibold text-foreground">{unreadTotal}</span> thông báo chưa đọc.
          </p>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-border p-4">
            <label className="relative block">
              <span className="sr-only">Tìm trong thông báo</span>
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="h-10 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]"
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm trong các thông báo đang hiển thị"
                value={keyword}
              />
            </label>
          </div>

          {notificationsQuery.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="h-[72px] rounded-lg bg-surface-2 motion-safe:animate-pulse" key={index} />
              ))}
            </div>
          ) : null}
          {notificationsQuery.isError ? (
            <p className="p-5 text-sm text-danger" role="alert">
              {getApiErrorMessage(notificationsQuery.error)}
            </p>
          ) : null}

          {!notificationsQuery.isLoading && !notificationsQuery.isError && visible.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center p-8 text-center">
              <div>
                <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
                  <Tray size={24} />
                </span>
                <p className="text-sm font-semibold text-foreground">{notifications.length === 0 ? "Chưa có thông báo" : "Không có thông báo phù hợp"}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {notifications.length === 0 ? "Các cập nhật liên quan đến tài khoản sẽ xuất hiện tại đây." : "Thử đổi phân loại hoặc từ khóa tìm kiếm."}
                </p>
              </div>
            </div>
          ) : null}

          {sections.map((section) => (
            <section key={section.label}>
              <h2 className="border-b border-border bg-slate-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">{section.label}</h2>
              <ul className="divide-y divide-slate-100">
                {section.items.map((item) => {
                  const unread = !item.readAt;
                  const group = notificationGroupOf(item);
                  const Icon = groupIcons[group];
                  return (
                    <li className={cn("group flex items-start gap-1 transition-colors hover:bg-slate-50", unread && "bg-primary-soft/40")} key={item.id}>
                      <button className="flex min-w-0 flex-1 cursor-pointer items-start gap-3.5 px-5 py-3.5 text-left" onClick={() => openNotification(item)} type="button">
                        <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full", unread ? "bg-primary-soft text-primary" : "bg-surface-2 text-text-secondary")}>
                          <Icon size={18} weight={unread ? "fill" : "regular"} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className={cn("text-sm text-foreground", unread ? "font-semibold" : "font-medium")}>{item.title ?? "Thông báo hệ thống"}</span>
                            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-secondary">{groupLabels[group]}</span>
                          </span>
                          {item.message ? <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-text-secondary">{item.message}</span> : null}
                          <span className="mt-1 block text-xs text-muted" title={formatVietnamDateTime(item.createdAt) ?? undefined}>
                            {relativeTime(item.createdAt) || (formatVietnamDateTime(item.createdAt) ?? "Không rõ thời gian")}
                          </span>
                        </span>
                        {unread ? <span aria-label="Chưa đọc" className="mt-3 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                      </button>
                      {unread ? (
                        <button
                          aria-label="Đánh dấu đã đọc"
                          className="mr-3 mt-3 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-text-secondary opacity-0 transition-opacity hover:bg-white hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
                          onClick={() => markRead.mutate(item.id)}
                          title="Đánh dấu đã đọc"
                          type="button"
                        >
                          <Check size={16} weight="bold" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <ResourcePagination
            data={pageData as never}
            page={page}
            size={size}
            updatePage={(nextPage) => updatePagination(router, searchParams, "page", String(nextPage + 1))}
            updatePageSize={(nextSize) => updatePagination(router, searchParams, "size", String(nextSize))}
          />
        </Panel>
      </div>
      <NotificationDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onOpenTarget={() => {
          const target = detailItem ? notificationHref(detailItem) : null;
          setDetailItem(null);
          if (target) router.push(target as Route);
        }}
        onViewPermissions={() => {
          setDetailItem(null);
          router.push(MY_PERMISSIONS_PATH as Route);
        }}
      />
    </div>
  );
}

function groupByDay(items: NotificationItem[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  const buckets: { label: string; items: NotificationItem[] }[] = [
    { label: "Hôm nay", items: [] },
    { label: "Hôm qua", items: [] },
    { label: "7 ngày qua", items: [] },
    { label: "Trước đó", items: [] },
  ];
  for (const item of items) {
    const time = item.createdAt ? new Date(item.createdAt).getTime() : Number.NaN;
    if (Number.isNaN(time) || time < startOfToday - 7 * day) buckets[3].items.push(item);
    else if (time >= startOfToday) buckets[0].items.push(item);
    else if (time >= startOfToday - day) buckets[1].items.push(item);
    else buckets[2].items.push(item);
  }
  return buckets.filter((bucket) => bucket.items.length > 0);
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
