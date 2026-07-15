"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import type { RouteConfig } from "@/features/workspace/routes";
import { ResourceCell, columnLabels } from "./resource-format";

export function DetailDrawer({ id, onClose, route }: { id?: string | null; onClose: () => void; route: RouteConfig }) {
  const query = useQuery({
    queryKey: ["resource-detail", route.endpoint, id],
    enabled: Boolean(id && route.endpoint),
    queryFn: () => apiFetch<Record<string, unknown>>(`${route.endpoint}/${encodeURIComponent(String(id))}`),
  });
  const row = query.data;
  const keys = row ? Object.keys(row).filter((key) => row[key] !== undefined) : route.columns;

  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[520px] flex-col border-l border-border bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <Dialog.Title className="text-xl font-semibold text-foreground">{route.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">Chi tiết từ API thật theo identifier {id}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {query.isLoading ? <div className="h-40 rounded-[12px] bg-surface-1 motion-safe:animate-pulse" /> : null}
            {query.isError ? <div className="rounded-[10px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{getApiErrorMessage(query.error)}</div> : null}
            {row ? (
              <dl className="space-y-3">
                {keys.map((key) => (
                  <div className="rounded-[10px] border border-border p-3" key={key}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{columnLabels[key] ?? key}</dt>
                    <dd className="mt-1 break-words text-sm text-foreground">
                      <ResourceCell column={key} row={row} value={row[key]} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
