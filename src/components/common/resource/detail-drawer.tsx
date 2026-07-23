"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import type { RouteConfig } from "@/config/routes/routes";
import { ResourceCell, columnLabels, formatLeaderLevel } from "./resource-format";

const AUDIT_KEYS = ["createdAt", "createdBy", "updatedAt", "updatedBy"] as const;
const FULL_WIDTH_KEYS = new Set(["description", "reason", "conditions", "approvalReason", "exceptionApprovalReason"]);
const ORG_PRIMARY_KEYS = ["name", "patronSaintDay", "establishmentDate"];
const LEADER_PRIMARY_KEYS = [
  "imageUrl",
  "holyName",
  "fullName",
  "firstName",
  "lastName",
  "birthDate",
  "gender",
  "leaderLevel",
  "deaneryName",
  "parishName",
  "email",
  "phoneNumber",
];

type RankHistoryRow = {
  id?: number;
  oldLevel?: string | null;
  newLevel?: string | null;
  promotionDate?: string | null;
  note?: string | null;
};

export function DetailDrawer({ id, onClose, route }: { id?: string | null; onClose: () => void; route: RouteConfig }) {
  const query = useQuery({
    queryKey: ["resource-detail", route.endpoint, id],
    enabled: Boolean(id && route.endpoint),
    queryFn: () => apiFetch<Record<string, unknown>>(`${route.endpoint}/${encodeURIComponent(String(id))}`),
  });
  const row = query.data;
  const keys = row ? detailKeys(route, row) : route.columns;
  const rankHistoryQuery = useQuery({
    queryKey: ["leader-rank-history", id],
    enabled: Boolean(id && route.kind === "leaders"),
    queryFn: () => apiFetch<RankHistoryRow[]>(`${route.endpoint}/${encodeURIComponent(String(id))}/rank-history`),
  });

  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[760px] flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <Dialog.Title className="text-xl font-semibold text-foreground">{route.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">Chi tiết bản ghi {id}</Dialog.Description>
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
              <div className="space-y-3">
                <dl className="grid auto-rows-min grid-cols-1 gap-3 md:grid-cols-2">
                  {keys.map((key) => (
                    <div className={detailItemClass(key)} key={key}>
                      <dt className="text-xs font-semibold uppercase text-muted">{detailLabel(route, key)}</dt>
                      <dd className="mt-1 break-words text-sm leading-6 text-foreground">
                        <ResourceCell column={key} displayMode="detail" row={row} value={row[key]} />
                      </dd>
                    </div>
                  ))}
                </dl>
                {route.kind === "leaders" ? (
                  <LeaderRankHistory
                    error={rankHistoryQuery.isError ? getApiErrorMessage(rankHistoryQuery.error) : undefined}
                    histories={rankHistoryQuery.data}
                    loading={rankHistoryQuery.isLoading}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function detailKeys(route: RouteConfig, row: Record<string, unknown>) {
  const baseKeys =
    route.kind === "accounts"
      ? ["username", "primaryRoleName", "secondaryRoleNames", "dioceseName", "authProvider", "providerId", "status"]
      : Object.keys(row);
  return orderDetailKeys(route, withAuditKeys(baseKeys)).filter((key) => shouldRenderKey(route, row, key));
}

function LeaderRankHistory({
  histories,
  loading,
  error,
}: {
  histories?: RankHistoryRow[];
  loading: boolean;
  error?: string;
}) {
  const items = [...(histories ?? [])].sort((left, right) => yearFromDate(right.promotionDate) - yearFromDate(left.promotionDate));

  return (
    <section className="rounded-[10px] border border-border bg-white p-3 shadow-sm">
      <h2 className="text-xs font-semibold uppercase text-muted">Lịch sử cấp bậc</h2>
      {loading ? <div className="mt-3 h-16 rounded-[8px] bg-surface-2 motion-safe:animate-pulse" /> : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="mt-2 text-sm text-muted">Chưa có lịch sử cấp bậc.</p> : null}
      {!loading && !error && items.length ? (
        <ol className="mt-3 space-y-2">
          {items.map((history, index) => (
            <li className="rounded-[8px] border border-surface-2 bg-surface-1/60 px-3 py-2 text-sm text-foreground" key={history.id ?? `${history.newLevel}-${history.promotionDate}-${index}`}>
              {rankHistorySentence(history)}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function rankHistorySentence(history: RankHistoryRow) {
  const level = history.newLevel ? formatLeaderLevel(history.newLevel) : "Cấp bậc chưa rõ";
  const year = yearFromDate(history.promotionDate);
  return year ? `${level} năm ${year}` : `${level} chưa có năm ghi nhận`;
}

function yearFromDate(value: string | null | undefined) {
  if (!value) return 0;
  const year = Number(value.slice(0, 4));
  return Number.isInteger(year) ? year : 0;
}

function withAuditKeys(keys: string[]) {
  const next = [...keys];
  AUDIT_KEYS.forEach((key) => {
    if (!next.includes(key)) next.push(key);
  });
  return next;
}

function orderDetailKeys(route: RouteConfig, keys: string[]) {
  if (route.kind === "dioceses" || route.kind === "deaneries" || route.kind === "parishes") {
    return prioritizeAndSendTail(keys, ORG_PRIMARY_KEYS, [...AUDIT_KEYS, "status"]);
  }

  if (route.kind === "leaders") {
    return prioritizeAndSendTail(keys, LEADER_PRIMARY_KEYS, [...AUDIT_KEYS, "status"]);
  }

  return prioritizeAndSendTail(keys, [], [...AUDIT_KEYS, "status"]);
}

function prioritizeAndSendTail(keys: string[], headKeys: readonly string[], tailKeys: readonly string[]) {
  const seen = new Set<string>();
  const pushExisting = (source: readonly string[]) =>
    source.filter((key) => {
      if (!keys.includes(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const head = pushExisting(headKeys);
  const tail = pushExisting(tailKeys);
  const middle = keys.filter((key) => !seen.has(key) && !tailKeys.includes(key));
  return [...head, ...middle, ...tail];
}

function detailLabel(route: RouteConfig, key: string) {
  if (route.kind === "accounts" && key === "primaryRoleName") return "Vai trò chính";
  if (route.kind === "accounts" && key === "secondaryRoleNames") return "Vai trò phụ";
  return columnLabels[key] ?? key;
}

function detailItemClass(key: string) {
  return [
    "rounded-[10px] border border-border bg-white p-3 shadow-sm",
    FULL_WIDTH_KEYS.has(key) ? "md:col-span-2" : "",
  ].filter(Boolean).join(" ");
}

function shouldRenderKey(route: RouteConfig, row: Record<string, unknown>, key: string) {
  if (row[key] === undefined && !isAuditKey(key)) return false;
  if (route.kind === "accounts" && ["leaderId", "leaderFullName", "primaryRoleCode", "roleCodes", "roleNames", "deaneryId", "deaneryName", "parishId", "parishName"].includes(key)) return false;
  if (route.kind === "accounts" && key === "secondaryRoleNames" && Array.isArray(row[key]) && row[key].length === 0) return false;
  if (key === "dioceseId" && typeof row.dioceseName === "string") return false;
  if (key === "deaneryId" && typeof row.deaneryName === "string") return false;
  if (key === "parishId" && typeof row.parishName === "string") return false;
  if (key === "unitId" && typeof row.unitName === "string") return false;
  return true;
}

function isAuditKey(key: string) {
  return AUDIT_KEYS.some((auditKey) => auditKey === key);
}
