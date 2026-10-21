"use client";

import { ArrowRight, Bell, Certificate, Checks, GraduationCap, ShieldCheck, TreeStructure, X } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadNotificationCount, type NotificationItem } from "../hooks";
import { notificationBadgeLabel, notificationGroupOf, notificationGroups, notificationHref, relativeTime, type NotificationGroupKey } from "../notification-meta";

type Filter = "all" | "unread" | NotificationGroupKey;

const groupIcons = {
  training: GraduationCap,
  certificate: Certificate,
  access: ShieldCheck,
  unit: TreeStructure,
  other: Bell,
} as const;

export function NotificationPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const unreadCountQuery = useUnreadNotificationCount();
  const listQuery = useNotifications({ page: 0, size: 50 }, { enabled: open });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = useMemo(() => listQuery.data?.content ?? [], [listQuery.data]);
  const unreadTotal = unreadCountQuery.data?.unreadCount ?? 0;
  const badge = notificationBadgeLabel(unreadTotal);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "all") return true;
        if (filter === "unread") return !item.readAt;
        return notificationGroupOf(item) === filter;
      }),
    [filter, items],
  );
  const unreadIds = items.filter((item) => !item.readAt).map((item) => item.id);

  function openItem(item: NotificationItem) {
    if (!item.readAt && !markRead.isPending) markRead.mutate(item.id);
    setOpen(false);
    router.push(notificationHref(item) as Route);
  }

  function markAllRead() {
    if (unreadIds.length === 0 || markAll.isPending) return;
    markAll.mutate(unreadIds, {
      onSuccess: () => toast.success("Đã đánh dấu tất cả thông báo là đã đọc"),
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  }

  const filters: { key: Filter; label: string }[] = [{ key: "all", label: "Tất cả" }, { key: "unread", label: "Chưa đọc" }, ...notificationGroups];

  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Trigger asChild>
        <button
          aria-label={badge ? `Thông báo, ${badge} chưa đọc` : "Thông báo"}
          className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          type="button"
        >
          <Bell size={20} />
          {badge ? (
            <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">{badge}</span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          aria-label="Thông báo"
          className="z-50 flex max-h-[min(640px,calc(100dvh-88px))] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none"
          sideOffset={10}
        >
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold leading-[26px] text-foreground">Thông báo</h2>
              {unreadTotal > 0 ? <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{unreadTotal} mới</span> : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label="Đánh dấu tất cả là đã đọc"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={unreadIds.length === 0 || markAll.isPending}
                onClick={markAllRead}
                title="Đánh dấu tất cả là đã đọc"
                type="button"
              >
                <Checks size={18} weight="bold" />
              </button>
              <Popover.Close
                aria-label="Đóng"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <X size={18} />
              </Popover.Close>
            </div>
          </div>

          <div aria-label="Lọc thông báo" className="flex gap-1.5 overflow-x-auto px-4 pb-3" role="tablist">
            {filters.map((item) => (
              <button
                aria-selected={filter === item.key}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  filter === item.key ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-surface-hover",
                )}
                key={item.key}
                onClick={() => setFilter(item.key)}
                role="tab"
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="min-h-[120px] flex-1 overflow-y-auto border-t border-border">
            {listQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((index) => (
                  <div className="h-16 rounded-lg bg-surface-2 motion-safe:animate-pulse" key={index} />
                ))}
              </div>
            ) : null}
            {listQuery.isError ? (
              <p className="p-4 text-sm text-danger" role="alert">
                {getApiErrorMessage(listQuery.error)}
              </p>
            ) : null}
            {!listQuery.isLoading && !listQuery.isError && visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">Không có thông báo nào trong mục này.</p>
            ) : null}
            <ul>
              {visible.map((item) => {
                const unread = !item.readAt;
                const Icon = groupIcons[notificationGroupOf(item)];
                return (
                  <li key={item.id}>
                    <button
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                        unread && "bg-primary-soft/50",
                      )}
                      onClick={() => openItem(item)}
                      type="button"
                    >
                      <span className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full", unread ? "bg-primary-soft text-primary" : "bg-surface-2 text-text-secondary")}>
                        <Icon size={20} weight={unread ? "fill" : "regular"} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("line-clamp-2 text-sm text-foreground", unread ? "font-semibold" : "font-medium")}>{item.title ?? "Thông báo hệ thống"}</span>
                        {item.message ? <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-text-secondary">{item.message}</span> : null}
                        <span className={cn("mt-1 block text-xs", unread ? "font-semibold text-primary" : "text-muted")}>{relativeTime(item.createdAt)}</span>
                      </span>
                      {unread ? <span aria-label="Chưa đọc" className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            className="flex cursor-pointer items-center justify-center gap-2 border-t border-border px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              router.push("/notifications" as Route);
            }}
            type="button"
          >
            Xem tất cả trong Trung tâm thông báo
            <ArrowRight size={16} weight="bold" />
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
