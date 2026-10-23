"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { DownloadSimple, FileArrowUp, FileXls, X } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createExcelImportJob, downloadFile, getApiErrorMessage, newIdempotencyKey } from "@/lib/api/client";
import { excelJobsStore } from "@/lib/jobs/excel-jobs-store";

type Props = {
  // Endpoint nhận file, ví dụ "/leaders/import".
  endpoint: string;
  title: string;
  description: string;
  // Các cột bắt buộc / lưu ý, hiển thị ngay dưới mô tả.
  hint?: string;
  triggerLabel?: string;
  // Endpoint tải file Excel mẫu (GET) và tên file dự phòng; có thì hộp thoại hiện nút "Tải file mẫu" bên cạnh phần tải file lên.
  templatePath?: string;
  templateFileName?: string;
};

const MAX_BYTES = 20 * 1024 * 1024;

// Import dữ liệu từ file Excel (.xlsx) chạy nền: hộp thoại chỉ gửi file và đóng ngay; tiến độ, kết quả và bảng lỗi (nếu có dòng lỗi thì
// backend không lưu gì) hiện ở khay tác vụ. Mỗi file chọn có một khóa idempotency nên bấm đúp / thử lại không import hai lần.
export function ExcelImportDialog({ endpoint, title, description, hint, triggerLabel = "Import Excel", templatePath, templateFileName = "mau-import.xlsx" }: Props) {
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setErrorMessage(null);
    keyRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  }

  function pick(next: File | null) {
    setErrorMessage(null);
    // File mới là ý định mới: khóa idempotency mới.
    keyRef.current = null;
    if (!next) {
      setFile(null);
      return;
    }
    if (!next.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setErrorMessage("Chỉ hỗ trợ file Excel định dạng .xlsx");
      return;
    }
    if (next.size > MAX_BYTES) {
      setFile(null);
      setErrorMessage("File Excel vượt quá 20MB");
      return;
    }
    setFile(next);
  }

  async function downloadTemplate() {
    if (!templatePath) return;
    setDownloadingTemplate(true);
    try {
      await downloadFile(templatePath, templateFileName);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function submit() {
    if (!file) return;
    setLoading(true);
    setErrorMessage(null);
    if (!keyRef.current) keyRef.current = newIdempotencyKey();
    try {
      const job = await createExcelImportJob(endpoint, file, keyRef.current);
      excelJobsStore.getState().track(job);
      if (job.warning) toast.warning(job.warning, { duration: 12000 });
      toast.info(job.replayed ? "File này đã được gửi trước đó, xem tiến độ ở khay tác vụ" : "Đã nhận file, đang import nền. Bạn có thể tiếp tục làm việc.");
      setOpen(false);
      reset();
    } catch (error) {
      // Giữ khóa: gửi lại cùng file sau lỗi mạng vẫn là cùng một yêu cầu.
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline">
          <FileArrowUp size={18} />
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,640px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>

          {hint ? <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-5 text-text-secondary">{hint}</p> : null}

          {templatePath ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 text-text-secondary">Chưa có file? Tải file mẫu, điền dữ liệu (xóa dòng ví dụ) rồi chọn file đã điền ở bên dưới.</span>
              <Button loading={downloadingTemplate} onClick={downloadTemplate} size="sm" type="button" variant="outline">
                <DownloadSimple size={16} />
                Tải file mẫu
              </Button>
            </div>
          ) : null}
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input px-4 py-4 text-sm hover:bg-slate-50">
            <FileXls className="shrink-0 text-success" size={28} />
            <span className="min-w-0 flex-1 truncate">
              {file ? <span className="font-medium text-foreground">{file.name}</span> : <span className="text-muted">Chọn file Excel (.xlsx) cần import</span>}
            </span>
            <span className="shrink-0 text-xs font-semibold text-primary">Chọn file</span>
            <input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              data-testid="excel-import-input"
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
              ref={inputRef}
              type="file"
            />
          </label>

          {errorMessage ? (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-medium text-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-3">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={!file} loading={loading} onClick={submit} type="button">
              Import
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
