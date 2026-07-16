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
  const keys = row ? detailKeys(route, row) : route.columns;

  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[540px] flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
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
          <div className="min-h-0 flex-1 overflow-y-auto bg-app-canvas/50 p-5">
            {query.isLoading ? <div className="h-40 rounded-[12px] border border-border bg-white motion-safe:animate-pulse" /> : null}
            {query.isError ? <div className="rounded-[10px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{getApiErrorMessage(query.error)}</div> : null}
            {row ? (
              <dl className="space-y-3">
                {keys.map((key) => (
                  <div className="rounded-[10px] border border-border bg-white p-3 shadow-sm" key={key}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{detailLabel(route, key)}</dt>
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

function detailKeys(route: RouteConfig, row: Record<string, unknown>) {
  if (route.kind === "accounts") {
    return ["username", "primaryRoleName", "secondaryRoleNames", "dioceseName", "authProvider", "providerId", "status"].filter((key) => shouldRenderKey(route, row, key));
  }
  return Object.keys(row).filter((key) => shouldRenderKey(route, row, key));
}

function detailLabel(route: RouteConfig, key: string) {
  if (route.kind === "accounts" && key === "primaryRoleName") return "Vai trò chính";
  if (route.kind === "accounts" && key === "secondaryRoleNames") return "Vai trò phụ";
  return columnLabels[key] ?? key;
}

function shouldRenderKey(route: RouteConfig, row: Record<string, unknown>, key: string) {
  if (row[key] === undefined) return false;
  if (route.kind === "accounts" && ["leaderId", "leaderFullName", "primaryRoleCode", "roleCodes", "roleNames", "deaneryId", "deaneryName", "parishId", "parishName"].includes(key)) return false;
  if (route.kind === "accounts" && key === "secondaryRoleNames" && Array.isArray(row[key]) && row[key].length === 0) return false;
  if (key === "dioceseId" && typeof row.dioceseName === "string") return false;
  if (key === "deaneryId" && typeof row.deaneryName === "string") return false;
  if (key === "parishId" && typeof row.parishName === "string") return false;
  if (key === "unitId" && typeof row.unitName === "string") return false;
  return true;
}
