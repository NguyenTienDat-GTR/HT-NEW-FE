"use client";

import { useQuery } from "@tanstack/react-query";
import { CaretDown } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { UnitLeaderLevelStats } from "../types";

// Độ rộng thanh theo tỉ lệ với cấp đông nhất; cấp có người luôn có thanh nhìn thấy được.
export function levelBarPercent(count: number, max: number) {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(4, Math.round((count / max) * 100));
}

// Thống kê huynh trưởng theo cấp độ của giáo phận / giáo hạt / giáo xứ.
// Là phần mở rộng, luôn thu gọn khi vào trang; chỉ gọi API khi người dùng mở ra.
export function UnitLeaderLevelStatsPanel({ endpoint, unitId }: { endpoint: string; unitId: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const query = useQuery({
    queryKey: ["unit-leader-level-stats", endpoint, unitId],
    enabled: open,
    queryFn: () => apiFetch<UnitLeaderLevelStats>(`${endpoint}/${encodeURIComponent(unitId)}/leader-level-stats`),
  });
  const levels = query.data?.levels ?? [];
  const max = levels.reduce((highest, level) => Math.max(highest, level.leaderCount), 0);

  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-1 text-left text-sm font-medium text-foreground hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>Thống kê huynh trưởng theo cấp độ</span>
        <CaretDown aria-hidden className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} size={16} />
      </button>
      <div hidden={!open} id={panelId}>
        {open ? (
          <div className="px-1 pb-1 pt-2">
            {query.isLoading ? <p className="text-sm text-muted">Đang tải…</p> : null}
            {query.isError ? <p className="text-sm text-danger">{getApiErrorMessage(query.error)}</p> : null}
            {query.data && levels.length === 0 ? <p className="text-sm text-muted">Chưa có danh mục cấp độ huynh trưởng.</p> : null}
            {levels.length > 0 ? (
              <ul className="space-y-2">
                {levels.map((level) => (
                  <li className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr_3.5rem]" key={level.levelCode}>
                    <span className="truncate text-sm text-foreground" title={level.levelName}>
                      {level.levelName}
                    </span>
                    <span aria-hidden className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${levelBarPercent(level.leaderCount, max)}%` }} />
                    </span>
                    <span className="text-right text-sm font-semibold tabular-nums text-foreground">{level.leaderCount.toLocaleString("vi-VN")}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {query.data ? (
              <p className="mt-2 border-t border-border pt-2 text-xs text-muted">
                Tổng cộng {query.data.total.toLocaleString("vi-VN")} huynh trưởng
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
