"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/common/resource/resource-format";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import type { UnitStatusHistoryItem } from "../types";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

// Lịch sử bật / tắt đơn vị: người đổi, thời điểm, lý do và phạm vi ảnh hưởng (phục vụ truy vết và phân tích theo thời điểm).
export function UnitStatusHistory({ endpoint, unitId }: { endpoint: string; unitId: string }) {
  const query = useQuery({
    queryKey: ["unit-status-history", endpoint, unitId],
    queryFn: () => apiFetch<UnitStatusHistoryItem[]>(`${endpoint}/${encodeURIComponent(unitId)}/status-history`),
  });

  return (
    <section className="rounded-[12px] border border-border bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase text-muted">Lịch sử bật / tắt</h2>
      {query.isLoading ? <p className="mt-3 text-sm text-muted">Đang tải…</p> : null}
      {query.isError ? <p className="mt-3 text-sm text-danger">{getApiErrorMessage(query.error)}</p> : null}
      {query.data && query.data.length === 0 ? <p className="mt-3 text-sm text-muted">Chưa có lịch sử.</p> : null}
      {query.data && query.data.length > 0 ? (
        <ol className="mt-3 space-y-3">
          {query.data.map((item) => (
            <li className="rounded-[10px] border border-border px-3 py-2.5" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.status ? "success" : "neutral"}>{item.status ? "Hoạt động" : "Ngưng hoạt động"}</Badge>
                <span className="text-xs text-muted">{formatDateTime(item.changedAt)}</span>
                {item.changedBy ? <span className="text-xs text-muted">· {item.changedBy}</span> : null}
                {item.eventType === "BASELINE" ? <span className="text-xs text-muted">· Trạng thái ban đầu</span> : null}
              </div>
              {item.reason ? <p className="mt-1.5 break-words text-sm text-foreground">Lý do: {item.reason}</p> : null}
              {item.eventType === "TOGGLE" && !item.status ? (
                <p className="mt-1 text-xs text-muted">
                  Ảnh hưởng {item.affectedAccountCount} tài khoản, {item.affectedChildUnitCount} đơn vị con
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
