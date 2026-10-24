"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { EnvelopeSimple, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/modules/badges/components/form-controls";
import type { InvitationOptions } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceEnabled: boolean;
  selectedIds: string[];
  summary: { total: number; sent: number; pending: number; withoutEmail: number };
  pending: boolean;
  onSend: (options: InvitationOptions) => void;
};

// Chọn cách gửi email thông tin tham dự: phạm vi (đã chọn / toàn bộ), kèm mã QR (chỉ khi khóa bật điểm danh), gửi lại cả hồ sơ đã gửi.
export function InvitationDialog(props: Props) {
  return (
    <Dialog.Root onOpenChange={props.onOpenChange} open={props.open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-elevated)] focus:outline-none">
          <InvitationBody {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Thân hộp thoại chỉ được dựng khi mở nên mỗi lần mở lại là một lựa chọn mới.
function InvitationBody({ attendanceEnabled, selectedIds, summary, pending, onSend }: Props) {
  const [includeQr, setIncludeQr] = useState(attendanceEnabled);
  const [resend, setResend] = useState(false);
  const hasSelection = selectedIds.length > 0;

  const scopeCount = hasSelection ? selectedIds.length : summary.total;
  const willSend = hasSelection ? (resend ? selectedIds.length : undefined) : resend ? summary.total : summary.pending;

  return (
    <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Gửi email thông tin tham dự</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Email gồm tên thánh, họ tên, giáo xứ, giáo hạt, giáo phận, tên khóa, thời gian tổ chức{attendanceEnabled ? " và mã QR điểm danh (tùy chọn)" : ""}.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm">
              <p className="font-semibold text-foreground">{hasSelection ? `Gửi cho ${selectedIds.length} hồ sơ đã chọn` : `Gửi cho cả danh sách tham dự (${summary.total} hồ sơ)`}</p>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                Đã gửi {summary.sent} · chưa gửi {summary.pending} · thiếu / sai email {summary.withoutEmail}
              </p>
            </div>

            <label className={`flex items-start gap-2 text-sm ${attendanceEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
              <input
                checked={includeQr && attendanceEnabled}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                disabled={!attendanceEnabled}
                onChange={(event) => setIncludeQr(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="font-medium text-foreground">Kèm mã QR điểm danh</span>
                <span className="block text-[13px] text-text-secondary">
                  {attendanceEnabled ? "Mỗi hồ sơ nhận mã QR riêng (ảnh nhúng trong thư và đính kèm)." : "Phải bật điểm danh trong cấu hình khóa thì mới gửi được mã QR."}
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input checked={resend} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" onChange={(event) => setResend(event.target.checked)} type="checkbox" />
              <span>
                <span className="font-medium text-foreground">Gửi lại cả hồ sơ đã được gửi</span>
                <span className="block text-[13px] text-text-secondary">Mặc định hồ sơ đã gửi thành công được bỏ qua để không gửi trùng.</span>
              </span>
            </label>

            {!hasSelection && summary.withoutEmail > 0 ? (
              <Callout tone="warning">{summary.withoutEmail} hồ sơ chưa có email hoặc email sai định dạng sẽ được liệt kê sau khi gửi; các hồ sơ còn lại vẫn được gửi bình thường.</Callout>
            ) : null}
            {willSend === 0 ? <Callout>Mọi hồ sơ trong phạm vi này đã được gửi. Bật “Gửi lại” nếu muốn gửi lần nữa.</Callout> : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </Dialog.Close>
            <Button
              disabled={scopeCount === 0}
              loading={pending}
              onClick={() => onSend({ participationIds: hasSelection ? selectedIds : undefined, includeQr: includeQr && attendanceEnabled, resend })}
              type="button"
            >
              <EnvelopeSimple size={16} /> Gửi email
            </Button>
          </div>
        </>
  );
}
