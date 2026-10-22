"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, FileXls, X } from "@phosphor-icons/react";
import { viNumber } from "@/lib/utils";
import type { SheetPreview } from "@/modules/analytics/excel";

type ExportPreviewProps = {
  preview: SheetPreview | null;
  exporting: boolean;
  onBack: () => void;
  onDownload: () => void;
};

/** Xem trước file Excel trước khi tải: người dùng kiểm tra tên file, tên sheet, cột đã chọn và các dòng đầu rồi mới xác nhận. */
export function ExportPreview({ preview, exporting, onBack, onDownload }: ExportPreviewProps) {
  return (
    <Dialog.Root onOpenChange={(open) => !open && onBack()} open={preview !== null}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-900/40 data-[state=open]:animate-[fade-in_160ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[80] flex max-h-[88vh] w-[min(1040px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-white text-[13px] leading-5 text-foreground shadow-[var(--shadow-elevated)] outline-none data-[state=open]:animate-[analytics-rise_220ms_ease-out]"
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold leading-6">Xem trước file Excel</Dialog.Title>
              {preview ? <p className="mt-0.5 break-words text-xs text-muted">{preview.fileName}</p> : null}
            </div>
            <Dialog.Close aria-label="Đóng" className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-2">
              <X className="h-4 w-4" weight="bold" />
            </Dialog.Close>
          </header>

          {preview ? (
            <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="flex items-center gap-2 border-b border-border bg-[#f1f5f9] px-3 py-1.5 text-xs text-text-secondary">
                  <FileXls className="h-4 w-4 text-[var(--viz-6)]" weight="bold" />
                  Sheet: <span className="rounded bg-white px-2 py-0.5 font-semibold text-foreground">{preview.sheetName}</span>
                </div>
                <div className="overflow-x-auto bg-white">
                  <div className="w-max min-w-full">
                    <p className="px-3 pb-1 pt-3 text-base font-bold text-[#1e40af]">{preview.title}</p>
                    {preview.infoLines.map((line) => (
                      <p className="px-3 text-xs text-text-secondary" key={line}>
                        {line}
                      </p>
                    ))}
                    <table className="mt-3 w-max min-w-full border-separate border-spacing-0 text-left text-xs">
                      <thead>
                        <tr>
                          {preview.headers.map((header) => (
                            <th className="whitespace-nowrap border border-[#cbd5e1] bg-[#1e40af] px-3 py-2 text-center font-semibold text-white" key={header}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, rowIndex) => (
                          <tr className={rowIndex % 2 === 1 ? "bg-[#f8fafc]" : undefined} key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td className="max-w-[280px] truncate whitespace-nowrap border-b border-[#e2e8f0] px-3 py-1.5" key={cellIndex} title={cell}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">
                Đang xem {viNumber.format(preview.shown)} / {viNumber.format(preview.total)} dòng. File tải về chứa đầy đủ {viNumber.format(preview.total)} dòng, có bộ lọc ở hàng tiêu đề và cố định hàng tiêu đề.
              </p>
            </div>
          ) : null}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <button className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground" onClick={onBack} type="button">
              <ArrowLeft className="h-4 w-4" weight="bold" />
              Quay lại chọn cột
            </button>
            <button
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
              disabled={exporting}
              onClick={onDownload}
              type="button"
            >
              <FileXls className="h-4 w-4" weight="bold" />
              {exporting ? "Đang tạo file…" : "Tải file Excel"}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
