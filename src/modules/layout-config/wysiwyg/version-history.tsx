"use client";

import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import { ClockClockwise } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";

export type ConfigVersion = {
  id: string;
  versionNo: number;
  createdAt: string;
  createdBy?: string | null;
  snapshot: Record<string, unknown>;
};

function countItems(snapshot: Record<string, unknown>): number {
  const list = (key: string) => (Array.isArray(snapshot[key]) ? (snapshot[key] as unknown[]).length : 0);
  return list("fieldLayout") + list("frontLayout") + list("backLayout");
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

// Lịch sử phiên bản: mỗi lần lưu, backend ghi lại bản trước đó (giữ 20 bản gần nhất). Khôi phục chỉ nạp nội dung vào trình soạn
// (hoàn tác được) chứ chưa lưu, nên người dùng vẫn xem lại rồi mới bấm Lưu.
export function VersionHistoryButton({
  path,
  queryKey,
  disabled,
  onRestore,
}: {
  /** Đường dẫn lấy lịch sử, ví dụ /certificates/config/{id}/versions; null khi cấu hình chưa lưu. */
  path: string | null;
  queryKey: string;
  disabled?: boolean;
  onRestore: (version: ConfigVersion) => void;
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["layout-config-versions", queryKey, path],
    queryFn: () => apiFetch<ConfigVersion[]>(path as string),
    enabled: open && Boolean(path),
  });
  const versions = query.data ?? [];

  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Trigger asChild>
        <Button aria-label="Lịch sử phiên bản" disabled={disabled || !path} size="sm" title={path ? "Xem và khôi phục các bản đã lưu trước đó" : "Lưu cấu hình để bắt đầu ghi lịch sử"} type="button" variant="outline">
          <ClockClockwise size={16} /> Lịch sử
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" className="z-50 w-[340px] rounded-xl border border-border bg-white p-2 shadow-[var(--shadow-card)]" collisionPadding={12} sideOffset={8}>
          <p className="px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Các bản đã lưu trước đó</p>
          {query.isLoading ? <p className="px-1.5 py-2 text-sm text-text-secondary">Đang tải…</p> : null}
          {query.isError ? (
            <p className="px-1.5 py-2 text-sm text-danger" role="alert">
              {getApiErrorMessage(query.error)}
            </p>
          ) : null}
          {!query.isLoading && !query.isError && versions.length === 0 ? (
            <p className="px-1.5 py-2 text-sm leading-5 text-text-secondary">Chưa có bản cũ nào. Mỗi lần bấm Lưu, hệ thống tự ghi lại bản trước đó (giữ 20 bản gần nhất).</p>
          ) : null}
          <ul className="max-h-[300px] space-y-1 overflow-y-auto">
            {versions.map((version) => (
              <li className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5" key={version.id}>
                <div className="min-w-0 text-[13px]">
                  <p className="font-semibold text-foreground">Bản {version.versionNo}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {formatTime(version.createdAt)}
                    {version.createdBy ? ` · ${version.createdBy}` : ""} · {countItems(version.snapshot)} phần tử
                  </p>
                </div>
                <button
                  className="h-8 shrink-0 cursor-pointer rounded-lg border border-input px-2.5 text-xs font-semibold text-primary hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => {
                    onRestore(version);
                    setOpen(false);
                    toast.message(`Đã nạp bản ${version.versionNo} vào trình soạn. Bấm Lưu để áp dụng, hoặc Ctrl+Z để hoàn tác.`);
                  }}
                  type="button"
                >
                  Khôi phục
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
