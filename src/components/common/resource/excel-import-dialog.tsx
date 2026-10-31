"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { DownloadSimple, FileArrowUp, FileXls, FileZip, X } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadFile, getApiErrorMessage } from "@/lib/api/client";
import { createExcelImportJob } from "@/lib/jobs/excel-jobs-client";
import { newIdempotencyKey } from "@/lib/api/idempotency";
import { excelJobsStore } from "@/lib/jobs/excel-jobs-store";
import {
  AvatarZipError,
  buildAvatarZip,
  MAX_OUTPUT_ZIP_BYTES,
  prepareAvatarZip,
  readEntry,
  revokeAvatarPreviews,
  type AvatarItem,
  type PreparedAvatarZip,
} from "@/lib/media/prepare-avatar-zip";
import { AvatarCropDialog } from "./avatar-crop-dialog";
import { AvatarZipPreview } from "./avatar-zip-preview";

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
  // Cho chọn thêm file ZIP ảnh đại diện (khớp cột "Tên file ảnh" trong Excel).
  allowAvatarZip?: boolean;
};

const MAX_BYTES = 20 * 1024 * 1024;

// Import dữ liệu từ file Excel (.xlsx) chạy nền: hộp thoại chỉ gửi file và đóng ngay; tiến độ, kết quả và bảng lỗi (nếu có dòng lỗi thì
// backend không lưu gì) hiện ở khay tác vụ. Mỗi file chọn có một khóa idempotency nên bấm đúp / thử lại không import hai lần.
export function ExcelImportDialog({ endpoint, title, description, hint, triggerLabel = "Import Excel", templatePath, templateFileName = "mau-import.xlsx", allowAvatarZip = false }: Props) {
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // ZIP ảnh: các ảnh đã tự cắt quanh khuôn mặt, đang chờ người dùng xem lại trước khi gửi.
  const zipInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [prepared, setPrepared] = useState<PreparedAvatarZip | null>(null);
  const [zipName, setZipName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [editing, setEditing] = useState<{ index: number; blob: Blob } | null>(null);

  function clearZip() {
    abortRef.current?.abort();
    abortRef.current = null;
    if (prepared) revokeAvatarPreviews(prepared.items);
    setPrepared(null);
    setZipName(null);
    setProgress(null);
    setEditing(null);
    if (zipInputRef.current) zipInputRef.current.value = "";
  }

  function reset() {
    setFile(null);
    setErrorMessage(null);
    keyRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
    clearZip();
  }

  async function pickZip(next: File | null) {
    clearZip();
    setErrorMessage(null);
    // ZIP mới là ý định mới: khóa idempotency mới.
    keyRef.current = null;
    if (!next) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setZipName(next.name);
    setProgress({ done: 0, total: 0 });
    try {
      const result = await prepareAvatarZip(next, (done, total) => setProgress({ done, total }), controller.signal);
      if (controller.signal.aborted) {
        revokeAvatarPreviews(result.items);
        return;
      }
      setPrepared(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      setZipName(null);
      setErrorMessage(error instanceof AvatarZipError ? error.message : "Không xử lý được file ZIP ảnh");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setProgress(null);
      }
    }
  }

  function updateItem(index: number, change: (item: AvatarItem) => AvatarItem) {
    // Ảnh đổi thì nội dung ZIP đổi: cần khóa idempotency mới.
    keyRef.current = null;
    setPrepared((current) => (current ? { ...current, items: current.items.map((item, i) => (i === index ? change(item) : item)) } : current));
  }

  function startEdit(index: number) {
    if (!prepared) return;
    try {
      // Chỉnh trên ảnh gốc trong ZIP để không cắt chồng lên ảnh đã cắt.
      setEditing({ index, blob: new Blob([readEntry(prepared.source, prepared.items[index].entryName) as BlobPart]) });
    } catch {
      setErrorMessage("Không đọc được ảnh gốc trong ZIP");
    }
  }

  async function applyEdit(cropped: File) {
    if (!editing) return;
    const bytes = new Uint8Array(await cropped.arrayBuffer());
    const previewUrl = URL.createObjectURL(cropped);
    updateItem(editing.index, (item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return { ...item, bytes, previewUrl, status: "ok" };
    });
    setEditing(null);
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
    const images = allowAvatarZip && prepared ? buildAvatarZip(prepared.items) : null;
    if (images && images.size > MAX_OUTPUT_ZIP_BYTES) {
      setLoading(false);
      setErrorMessage("Các ảnh sau khi xử lý vượt quá 50MB, vui lòng bỏ bớt ảnh hoặc chia thành nhiều lần import");
      return;
    }
    if (!keyRef.current) keyRef.current = newIdempotencyKey();
    try {
      const job = await createExcelImportJob(endpoint, file, keyRef.current, images);
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
    <>
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,720px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-elevated)] focus:outline-none">
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

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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

            {allowAvatarZip ? (
              <div className="mt-4">
                <p className="mb-2 text-xs leading-5 text-text-secondary">
                  Ảnh đại diện (không bắt buộc): nén các ảnh thành một file .zip, đặt tên từng ảnh trùng cột <strong>Tên file ảnh</strong> trong Excel (ví dụ 0901234567.jpg).
                  Dòng không ghi tên file ảnh vẫn được import, chỉ là chưa có ảnh. Hãy chọn ảnh chân dung{" "}
                  <strong>người ở giữa ảnh, nhìn thẳng, rõ mặt, đủ sáng, mỗi ảnh một người</strong>; hệ thống tự căn khuôn mặt vào giữa khung 4x6 và bạn có thể xem lại, chỉnh
                  hoặc bỏ từng ảnh bên dưới.
                </p>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input px-4 py-3 text-sm hover:bg-slate-50">
                  <FileZip className="shrink-0 text-primary" size={28} />
                  <span className="min-w-0 flex-1 truncate">
                    {zipName ? <span className="font-medium text-foreground">{zipName}</span> : <span className="text-muted">Chọn file ZIP ảnh đại diện (tùy chọn)</span>}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-primary">Chọn file</span>
                  <input
                    accept=".zip,application/zip"
                    className="sr-only"
                    data-testid="avatar-zip-input"
                    disabled={progress !== null}
                    onChange={(event) => void pickZip(event.target.files?.[0] ?? null)}
                    ref={zipInputRef}
                    type="file"
                  />
                </label>
                {progress ? (
                  <div className="mt-2" role="status">
                    <p className="text-xs text-muted">
                      Đang xử lý ảnh {progress.done}/{progress.total || "…"} (nhận diện khuôn mặt và cắt khung 4x6)
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "5%" }} />
                    </div>
                  </div>
                ) : null}
                {prepared ? (
                  <>
                    <AvatarZipPreview items={prepared.items} onEdit={startEdit} onToggleRemoved={(index) => updateItem(index, (item) => ({ ...item, removed: !item.removed }))} />
                    <Button className="mt-2" onClick={clearZip} size="sm" type="button" variant="ghost">
                      Bỏ file ZIP ảnh
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-medium text-danger" role="alert">
                {errorMessage}
              </p>
            ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button onClick={() => setOpen(false)} type="button" variant="outline">
                Hủy
              </Button>
              <Button disabled={!file || progress !== null} loading={loading} onClick={submit} type="button">
                Import
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {editing && prepared ? (
        <AvatarCropDialog
          blob={editing.blob}
          fileName={prepared.items[editing.index].entryName}
          onCancel={() => setEditing(null)}
          onConfirm={(cropped) => void applyEdit(cropped)}
        />
      ) : null}
    </>
  );
}
