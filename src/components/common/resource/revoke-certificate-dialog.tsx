"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ProhibitInset, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type RevokeCertificateTarget = { code: string; leaderName?: string; courseName?: string };

const textareaClass = "w-full rounded-[8px] border border-border bg-white px-3 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none";

// Hộp thoại xác nhận thu hồi chứng nhận (tự dựng, không dùng alert/confirm của trình duyệt). Bắt buộc nhập lý do.
export function RevokeCertificateDialog({
  target,
  loading,
  onClose,
  onConfirm,
}: {
  target: RevokeCertificateTarget | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <Dialog.Root open={target !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        {/* key theo mã chứng nhận để xóa lý do đã nhập khi mở cho chứng nhận khác. */}
        {target ? <RevokeForm key={target.code} loading={loading} onClose={onClose} onConfirm={onConfirm} target={target} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RevokeForm({
  target,
  loading,
  onClose,
  onConfirm,
}: {
  target: RevokeCertificateTarget;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const missingReason = !reason.trim();

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[14px] border border-border bg-white p-5 shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <ProhibitInset size={20} weight="bold" />
          </span>
          <div>
            <Dialog.Title className="text-lg font-semibold text-foreground">Thu hồi chứng nhận</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
              Chứng nhận <span className="font-semibold text-foreground">{target.code}</span>
              {target.leaderName ? <> của <span className="font-semibold text-foreground">{target.leaderName}</span></> : null}
              {target.courseName ? <> (khóa {target.courseName})</> : null} sẽ bị thu hồi.
            </Dialog.Description>
          </div>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>

      <ul className="mt-4 list-disc space-y-1 rounded-[10px] border border-danger/20 bg-danger/5 py-3 pl-8 pr-3 text-sm text-foreground">
        <li>Hồ sơ của khóa huấn luyện liên kết sẽ chuyển thành <span className="font-semibold">Không đạt</span>, dù điểm cao hơn điểm đạt.</li>
        <li>Không thể xuất PDF, duyệt lại hay sửa điểm của hồ sơ này nữa.</li>
        <li>Thao tác không hoàn tác được.</li>
      </ul>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-foreground">
          Lý do thu hồi <span className="text-danger">*</span>
        </span>
        <textarea
          autoFocus
          className={`${textareaClass} min-h-28`}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Nhập lý do thu hồi (bắt buộc)"
          value={reason}
        />
      </label>

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={missingReason} loading={loading} onClick={() => onConfirm(reason.trim())} type="button" variant="destructive">
          Thu hồi chứng nhận
        </Button>
      </div>
    </Dialog.Content>
  );
}
