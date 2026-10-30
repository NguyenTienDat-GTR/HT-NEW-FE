"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CopySimple, X } from "@phosphor-icons/react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, apiMutation } from "@/lib/api/client";
import { deaneryOptions, filterCandidates, idsToCopy, parishOptions } from "../candidate-filter";
import { emptyFilters, type CandidateFilters, type CopyCandidate, type CopyResult, type CopySources } from "../types";
import { CandidateFilterBar } from "./candidate-filter-bar";
import { CandidateTable } from "./candidate-table";
import { SourceCoursePicker } from "./source-course-picker";
import { resourceKey } from "@/lib/api/query-keys";

// Sao chép danh sách tham dự của khóa tiên quyết đã kết thúc vào danh sách tham dự của khóa (không cần duyệt đăng ký lại).
// Nút chỉ hiện khi khóa còn sao chép được và có ít nhất một khóa tiên quyết đã kết thúc trong phạm vi khóa.
export function PrerequisiteCopyDialog({ courseCode }: { courseCode: string }) {
  const queryClient = useQueryClient();
  const base = `/training/courses/${encodeURIComponent(courseCode)}/prerequisite-copy`;
  const [open, setOpen] = useState(false);
  const [sourceCodes, setSourceCodes] = useState<string[]>([]);
  const [includeFailed, setIncludeFailed] = useState(false);
  const [filters, setFilters] = useState<CandidateFilters>(emptyFilters);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const sourcesQuery = useQuery({
    queryKey: resourceKey("prerequisite-copy-sources", courseCode),
    enabled: Boolean(courseCode),
    queryFn: () => apiFetch<CopySources>(`${base}/sources`),
    retry: false,
  });
  const sources = sourcesQuery.data;

  const sortedCodes = useMemo(() => [...sourceCodes].sort(), [sourceCodes]);
  const candidatesQuery = useQuery({
    queryKey: ["prerequisite-copy-candidates", courseCode, sortedCodes, includeFailed],
    enabled: open && sortedCodes.length > 0,
    queryFn: () => {
      const params = new URLSearchParams();
      sortedCodes.forEach((code) => params.append("sourceCourseCodes", code));
      params.set("includeFailed", String(includeFailed));
      return apiFetch<CopyCandidate[]>(`${base}/candidates?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
  const candidates = useMemo(() => (sortedCodes.length > 0 ? (candidatesQuery.data ?? []) : []), [candidatesQuery.data, sortedCodes.length]);
  const visible = useMemo(() => filterCandidates(candidates, filters, includeFailed), [candidates, filters, includeFailed]);
  const toCopy = useMemo(() => idsToCopy(visible, excluded), [visible, excluded]);
  const blockedCount = visible.filter((row) => row.blockedReason).length;

  const copy = useMutation({
    mutationFn: () => apiMutation<CopyResult>(base, "POST", { sourceCourseCodes: sortedCodes, includeFailed, leaderIds: toCopy }),
    onSuccess: async (result) => {
      toast.success(`Đã sao chép ${result.copied} hồ sơ vào danh sách tham dự`);
      if (result.skipped.length > 0) {
        toast.warning(`${result.skipped.length} hồ sơ không được sao chép: ${result.skipped[0].reason}${result.skipped.length > 1 ? "…" : ""}`);
      }
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: resourceKey() });
      await queryClient.invalidateQueries({ queryKey: ["prerequisite-copy-candidates", courseCode] });
    },
  });

  if (!sources?.available || sources.sources.length === 0) return null;

  function reset() {
    setSourceCodes(sources?.sources.map((source) => source.courseCode) ?? []);
    setIncludeFailed(false);
    setFilters(emptyFilters);
    setExcluded(new Set());
  }

  function toggle(leaderId: string) {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(leaderId)) next.delete(leaderId);
      else next.add(leaderId);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setExcluded((current) => {
      const next = new Set(current);
      visible.filter((row) => !row.blockedReason).forEach((row) => (checked ? next.delete(row.leaderId) : next.add(row.leaderId)));
      return next;
    });
  }

  function changeIncludeFailed(value: boolean) {
    setIncludeFailed(value);
    setFilters((current) => ({ ...current, result: "" }));
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline">
          <CopySimple size={18} />
          Sao chép từ khóa tiên quyết
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(96vw,980px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Sao chép danh sách tham dự từ khóa tiên quyết</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                Hồ sơ được sao chép vào thẳng danh sách tham dự (không cần duyệt đăng ký lại, không kiểm tra điều kiện của khóa). Người đã gửi đăng ký ở khóa tiên quyết, admin giáo xứ và huynh
                trưởng nhận thông báo như khi duyệt hồ sơ; khóa bật tự gửi email thì hồ sơ được gửi email thông tin tham dự.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto px-5 py-4">
            <section className="space-y-2">
              <h3 className="text-[13px] font-semibold text-foreground">
                Khóa tiên quyết đã kết thúc{sources.prerequisiteTypeName ? ` (${sources.prerequisiteTypeName})` : ""}
              </h3>
              <SourceCoursePicker onChange={setSourceCodes} selected={sourceCodes} sources={sources.sources} />
            </section>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-foreground">Hồ sơ cần sao chép</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Radio checked={!includeFailed} label="Chỉ hồ sơ có kết quả đạt" onChange={() => changeIncludeFailed(false)} />
                <Radio checked={includeFailed} label="Bao gồm cả hồ sơ có kết quả không đạt" onChange={() => changeIncludeFailed(true)} />
              </div>
            </fieldset>

            {sortedCodes.length === 0 ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] text-foreground">Chọn ít nhất một khóa tiên quyết để xem danh sách hồ sơ.</p>
            ) : (
              <section className="space-y-3">
                <CandidateFilterBar
                  deaneries={deaneryOptions(candidates)}
                  filters={filters}
                  onChange={setFilters}
                  parishes={parishOptions(candidates, filters.deaneryId)}
                  showResult={includeFailed}
                />
                <p className="text-xs text-muted">
                  {candidatesQuery.isFetching ? "Đang tải danh sách…" : `Hiển thị ${visible.length}/${candidates.length} hồ sơ`}
                  {blockedCount > 0 ? ` · ${blockedCount} hồ sơ không sao chép được` : ""}. Bỏ tick hồ sơ không muốn sao chép; chỉ các hồ sơ đang hiển thị theo bộ lọc và được tick mới được
                  sao chép.
                </p>
                <CandidateTable excluded={excluded} onToggle={toggle} onToggleAll={toggleAll} rows={visible} showSource={sortedCodes.length > 1} />
              </section>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <span className="text-sm text-text-secondary">
              Sẽ sao chép <span className="font-semibold text-foreground">{toCopy.length}</span> hồ sơ
            </span>
            <div className="flex gap-3">
              <Button onClick={() => setOpen(false)} type="button" variant="outline">
                Hủy
              </Button>
              <Button disabled={toCopy.length === 0 || candidatesQuery.isFetching} loading={copy.isPending} onClick={() => copy.mutate()} type="button">
                <CopySimple size={18} />
                Sao chép {toCopy.length > 0 ? `${toCopy.length} hồ sơ` : ""}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Radio({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input checked={checked} className="accent-[var(--primary)]" onChange={onChange} type="radio" />
      <span>{label}</span>
    </label>
  );
}
