"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { CopyCandidate } from "@/modules/prerequisite-copy/types";

type ResultFilter = "" | "PASSED" | "FAILED";

// Hồ sơ chọn mặc định khi mở hộp thoại lần đầu: mọi hồ sơ sao chép được (cách "Chỉ hồ sơ có kết quả đạt" thì chỉ hồ sơ đạt).
export function defaultLeaderSelection(candidates: CopyCandidate[], passedOnly: boolean) {
  return candidates.filter((item) => !item.blockedReason && (!passedOnly || item.finalResult === "PASSED")).map((item) => item.leaderId);
}

export function matchesCandidate(item: CopyCandidate, keyword: string, result: ResultFilter) {
  if (result && item.finalResult !== result) return false;
  const text = keyword.trim().toLowerCase();
  if (!text) return true;
  const haystack = [item.holyName, item.fullName, item.parishName, item.deaneryName, item.sourceCourseName].filter(Boolean).join(" ").toLowerCase();
  return text.split(/\s+/).every((part) => haystack.includes(part));
}

// Chọn từng huynh trưởng từ danh sách tham dự của các khóa nguồn để sao chép vào khóa đích.
export function CopyLeadersDialog({
  open,
  onClose,
  onConfirm,
  courseCode,
  courseTypeCode,
  sourceCourseCodes,
  initialSelection,
  passedOnly,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (leaderIds: string[]) => void;
  courseCode?: string;
  courseTypeCode?: string;
  sourceCourseCodes: string[];
  // Danh sách đã chọn riêng trước đó (undefined = chưa chọn riêng, dùng mặc định theo cách sao chép).
  initialSelection?: string[];
  passedOnly: boolean;
}) {
  const query = useQuery({
    queryKey: ["course-copy-candidates", courseCode ?? courseTypeCode ?? "", sourceCourseCodes],
    enabled: open && sourceCourseCodes.length > 0 && Boolean(courseCode || courseTypeCode),
    queryFn: () => {
      const params = new URLSearchParams();
      if (courseCode) params.set("courseCode", courseCode);
      else if (courseTypeCode) params.set("courseTypeCode", courseTypeCode);
      sourceCourseCodes.forEach((code) => params.append("sourceCourseCodes", code));
      return apiFetch<CopyCandidate[]>(`/training/courses/copy-sources/candidates?${params.toString()}`);
    },
  });
  const candidates = useMemo(() => query.data ?? [], [query.data]);
  // Chưa chạm vào ô nào thì lấy lựa chọn mặc định; sau khi người dùng chọn thì giữ theo người dùng.
  const [edited, setEdited] = useState<string[] | null>(null);
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<ResultFilter>("");
  const selected = useMemo(() => new Set(edited ?? initialSelection ?? defaultLeaderSelection(candidates, passedOnly)), [edited, initialSelection, candidates, passedOnly]);
  const visible = useMemo(() => candidates.filter((item) => matchesCandidate(item, keyword, result)), [candidates, keyword, result]);
  const selectableVisible = visible.filter((item) => !item.blockedReason);

  function commit(next: Set<string>) {
    setEdited(Array.from(next));
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commit(next);
  }

  function toggleVisible(on: boolean) {
    const next = new Set(selected);
    selectableVisible.forEach((item) => (on ? next.add(item.leaderId) : next.delete(item.leaderId)));
    commit(next);
  }

  const chosen = Array.from(selected).filter((id) => candidates.some((item) => item.leaderId === id && !item.blockedReason));
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((item) => selected.has(item.leaderId));

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Chọn hồ sơ huynh trưởng để sao chép
                <HelpTip>
                  Danh sách gồm các huynh trưởng trong danh sách tham dự của các khóa nguồn đã chọn. Tích chọn những người bạn muốn đưa vào khóa này; người không được tích sẽ không được sao chép. Huynh trưởng đã có trong khóa, ngưng hoạt động hoặc thuộc giáo xứ bị khóa không chọn được.
                </HelpTip>
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                Tích chọn từng huynh trưởng cần đưa vào danh sách tham dự của khóa. Hồ sơ sao chép vào thẳng danh sách (đã duyệt) khi bạn lưu khóa.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="icon">
                <X size={16} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <Input aria-label="Tìm huynh trưởng" className="h-9 pl-9" onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tên, giáo xứ, giáo hạt hoặc khóa nguồn" value={keyword} />
            </div>
            <select
              aria-label="Lọc theo kết quả"
              className="h-9 rounded-lg border border-input bg-white px-2 text-sm focus:border-primary focus:outline-none"
              onChange={(event) => setResult(event.target.value as ResultFilter)}
              value={result}
            >
              <option value="">Mọi kết quả</option>
              <option value="PASSED">Đạt</option>
              <option value="FAILED">Không đạt</option>
            </select>
            <Button disabled={selectableVisible.length === 0} onClick={() => toggleVisible(!allVisibleSelected)} size="sm" type="button" variant="outline">
              {allVisibleSelected ? "Bỏ chọn danh sách này" : "Chọn cả danh sách này"}
            </Button>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
            {query.isLoading ? (
              <div className="h-32 animate-pulse bg-surface-1" />
            ) : query.isError ? (
              <p className="px-3 py-4 text-sm text-danger">{getApiErrorMessage(query.error)}</p>
            ) : candidates.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">Các khóa nguồn đã chọn chưa có hồ sơ nào để sao chép.</p>
            ) : visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">Không có hồ sơ nào khớp bộ lọc.</p>
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((item) => {
                  const blocked = Boolean(item.blockedReason);
                  return (
                    <li key={item.leaderId}>
                      <label className={cn("flex items-start gap-3 px-3 py-2.5", blocked ? "cursor-not-allowed bg-surface-1 opacity-70" : "cursor-pointer hover:bg-surface-1")}>
                        <input checked={selected.has(item.leaderId) && !blocked} className="mt-1 h-4 w-4 shrink-0 accent-primary" disabled={blocked} onChange={() => toggle(item.leaderId)} type="checkbox" />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold text-foreground">{[item.holyName, item.fullName].filter(Boolean).join(" ")}</span>
                          <span className="block break-words text-xs text-text-secondary">{[item.parishName, item.deaneryName].filter(Boolean).join(" · ")}</span>
                          <span className="block break-words text-xs text-muted">Khóa nguồn: {item.sourceCourseName}</span>
                          {blocked ? <span className="mt-0.5 block text-xs font-medium text-warning">Không sao chép được: {item.blockedReason}</span> : null}
                        </span>
                        <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", item.finalResult === "PASSED" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                          {item.finalResult === "PASSED" ? "Đạt" : "Không đạt"}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              Đã chọn <span className="font-semibold text-foreground">{chosen.length}</span> / {candidates.filter((item) => !item.blockedReason).length} hồ sơ
            </p>
            <div className="flex gap-2">
              <Button onClick={onClose} type="button" variant="outline">
                Hủy
              </Button>
              <Button disabled={chosen.length === 0} onClick={() => onConfirm(chosen)} type="button">
                Xác nhận chọn
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
