"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import {
  CaretLeft,
  CaretRight,
  Check,
  Eye,
  FileXls,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { useSessionState } from "@/lib/use-session-state";
import { cn, viNumber } from "@/lib/utils";
import { SkeletonBlock } from "@/modules/analytics/components/section-card";
import {
  buildSheetPreview,
  exportRecordsToExcel,
  type ExcelExportInput,
} from "@/modules/analytics/excel";
import { ExportPreview } from "@/modules/analytics/components/export-preview";
import { effectiveRange, withResolvedRange } from "@/modules/analytics/presets";
import {
  exportPath,
  useRecords,
  type DrillTarget,
} from "@/modules/analytics/queries";
import {
  columnLabel,
  exportableColumns,
  formatRecordValue,
} from "@/modules/analytics/record-format";
import type {
  AnalyticsFilterState,
  RecordDataset,
  RecordsResponse,
} from "@/modules/analytics/types";

const PAGE_SIZE = 15;
// Cột chứa văn bản dài: cắt bằng dấu … (rê chuột xem đủ) thay vì giãn bảng làm vỡ bố cục.
const LONG_COLUMNS = new Set([
  "name",
  "leaderName",
  "courseName",
  "courseType",
  "parish",
  "deanery",
  "leaderLevel",
]);

type RecordsDrawerProps = {
  target: DrillTarget | null;
  filters: AnalyticsFilterState;
  onClose: () => void;
};

/** Hộp chọn cột cần xuất: mỗi loại dữ liệu nhớ lựa chọn riêng trong phiên; mặc định xuất mọi cột. */
function ExportMenu({
  dataset,
  columns,
  disabled,
  exporting,
  onExport,
}: {
  dataset: RecordDataset;
  columns: string[];
  disabled: boolean;
  exporting: boolean;
  onExport: (selected: string[]) => void;
}) {
  const [saved, setSaved] = useSessionState<string[] | null>(
    `analytics:export-columns:${dataset}`,
    null,
  );
  const selected = columns.filter((column) =>
    (saved ?? columns).includes(column),
  );
  const toggle = (column: string) =>
    setSaved(
      selected.includes(column)
        ? selected.filter((item) => item !== column)
        : columns.filter((item) => item === column || selected.includes(item)),
    );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-white px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={disabled}
          type="button"
        >
          <FileXls className="h-4 w-4 text-[var(--viz-6)]" weight="bold" />
          Xuất Excel
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-[60] w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-white p-3 shadow-[var(--shadow-elevated)] data-[state=open]:animate-[account-menu-in_160ms_ease-out]"
          sideOffset={8}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Chọn cột cần xuất
            </p>
            <div className="flex gap-2 text-xs font-semibold text-primary">
              <button
                className="cursor-pointer hover:underline"
                onClick={() => setSaved(columns)}
                type="button"
              >
                Tất cả
              </button>
              <button
                className="cursor-pointer hover:underline"
                onClick={() => setSaved([])}
                type="button"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
          <ul className="mt-2 max-h-64 space-y-0.5 overflow-auto">
            {columns.map((column) => {
              const checked = selected.includes(column);
              return (
                <li key={column}>
                  <button
                    aria-checked={checked}
                    className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
                    onClick={() => toggle(column)}
                    role="checkbox"
                    type="button"
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded border transition-colors",
                        checked
                          ? "border-primary bg-primary text-white"
                          : "border-input bg-white",
                      )}
                    >
                      {checked ? (
                        <Check className="h-3 w-3" weight="bold" />
                      ) : null}
                    </span>
                    {columnLabel(column)}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
            disabled={exporting || selected.length === 0}
            onClick={() => onExport(selected)}
            type="button"
          >
            <Eye className="h-4 w-4" weight="bold" />
            {exporting
              ? "Đang chuẩn bị…"
              : selected.length === 0
                ? "Chọn ít nhất một cột"
                : `Xem trước file (${selected.length} cột)`}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Danh sách chi tiết của phần tử biểu đồ vừa bấm; dùng đúng bộ lọc đang áp dụng nên tổng khớp con số trên biểu đồ. */
export function RecordsDrawer({
  target,
  filters,
  onClose,
}: RecordsDrawerProps) {
  // Trang gắn với phần tử đang xem: đổi phần tử thì tự về trang đầu mà không cần effect.
  const targetKey = `${target?.dataset}|${target?.dimension}|${target?.value}`;
  const [pageState, setPageState] = useState({ key: "", page: 0 });
  const page = pageState.key === targetKey ? pageState.page : 0;
  const setPage = (update: (value: number) => number) =>
    setPageState({ key: targetKey, page: update(page) });
  const [exporting, setExporting] = useState(false);
  const query = useRecords(filters, target, page, PAGE_SIZE);
  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Bản xem trước giữ nguyên dữ liệu đã tải: bấm tải file không phải gọi lại BE, và file khớp đúng những gì người dùng vừa xem.
  const [pending, setPending] = useState<ExcelExportInput | null>(null);

  const preparePreview = async (selected: string[]) => {
    if (!target) return;
    setExporting(true);
    try {
      const all = await apiFetch<RecordsResponse>(
        exportPath(withResolvedRange(filters), target),
      );
      setPending({
        dataset: target.dataset,
        columns: selected,
        rows: all.rows,
        scopeTitle: target.title,
        // Danh sách huynh trưởng là ảnh chụp hiện tại nên không gắn khoảng thời gian.
        period: target.dataset === "leaders" ? null : effectiveRange(filters),
        generatedAt: new Date(),
      });
    } catch {
      toast.error("Không tải được dữ liệu để xem trước. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const downloadExcel = async () => {
    if (!pending) return;
    setExporting(true);
    try {
      const name = await exportRecordsToExcel(pending);
      toast.success(
        `Đã xuất ${viNumber.format(pending.rows.length)} dòng: ${name}`,
      );
      setPending(null);
    } catch {
      toast.error("Không tạo được file Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const columns = exportableColumns(data?.columns ?? []);

  return (
    <>
      <Dialog.Root
        onOpenChange={(open) => !open && onClose()}
        open={target !== null}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] data-[state=open]:animate-[fade-in_160ms_ease-out]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 right-0 z-50 flex w-[min(960px,100vw)] flex-col border-l border-border bg-white text-[13px] leading-5 text-foreground shadow-[var(--shadow-elevated)] outline-none data-[state=open]:animate-[analytics-rise_220ms_ease-out]"
          >
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0 flex-1 basis-56">
                <Dialog.Title
                  className="line-clamp-2 text-base font-semibold leading-6 text-foreground"
                  title={target?.title}
                >
                  {target?.title}
                </Dialog.Title>
                <p className="mt-0.5 text-xs text-muted">
                  {data
                    ? `${viNumber.format(data.total)} bản ghi theo bộ lọc hiện tại`
                    : "Đang tải…"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {target && data ? (
                  <ExportMenu
                    columns={columns}
                    dataset={target.dataset}
                    disabled={!data.total}
                    exporting={exporting}
                    onExport={preparePreview}
                  />
                ) : null}
                <Dialog.Close
                  aria-label="Đóng"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="h-5 w-5" weight="bold" />
                </Dialog.Close>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-6 sm:py-4">
              {query.isError ? (
                <p
                  className="rounded-lg bg-[#fef2f2] p-4 text-sm text-danger"
                  role="alert"
                >
                  Không tải được danh sách chi tiết.
                </p>
              ) : !data ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <SkeletonBlock className="h-10 w-full" key={index} />
                  ))}
                </div>
              ) : data.rows.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted">
                  Không có bản ghi nào.
                </p>
              ) : (
                <table className="w-max min-w-full border-separate border-spacing-0 text-left text-[13px]">
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th
                          className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-white px-3 py-2 text-xs font-semibold text-muted"
                          key={column}
                        >
                          {columnLabel(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={
                      query.isPlaceholderData
                        ? "opacity-55 transition-opacity"
                        : "transition-opacity"
                    }
                  >
                    {data.rows.map((row, index) => (
                      <tr
                        className="transition-colors hover:bg-surface-1"
                        key={`${String(row.id)}-${index}`}
                      >
                        {columns.map((column) => (
                          <td
                            className={cn(
                              "border-b border-border/70 px-3 py-2 align-middle text-foreground",
                              LONG_COLUMNS.has(column)
                                ? "max-w-[260px] truncate"
                                : "whitespace-nowrap",
                            )}
                            key={column}
                            title={
                              LONG_COLUMNS.has(column)
                                ? formatRecordValue(column, row[column])
                                : undefined
                            }
                          >
                            {formatRecordValue(column, row[column]) || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 sm:px-6">
              <span className="text-[13px] text-muted tabular-nums">
                Trang {page + 1} / {pages}
              </span>
              <div className="flex gap-2">
                <button
                  aria-label="Trang trước"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-input bg-white transition-colors hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                  type="button"
                >
                  <CaretLeft className="h-4 w-4" weight="bold" />
                </button>
                <button
                  aria-label="Trang sau"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-input bg-white transition-colors hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((value) => value + 1)}
                  type="button"
                >
                  <CaretRight className="h-4 w-4" weight="bold" />
                </button>
              </div>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ExportPreview
        exporting={exporting}
        onBack={() => setPending(null)}
        onDownload={downloadExcel}
        preview={pending ? buildSheetPreview(pending) : null}
      />
    </>
  );
}
