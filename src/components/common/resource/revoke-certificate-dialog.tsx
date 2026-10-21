"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowsCounterClockwise, ProhibitInset, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type RevokeCertificateTarget = { code: string; leaderName?: string; courseName?: string };

const textareaClass = "w-full rounded-[8px] border border-border bg-white px-3 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none";

// Hộp thoại xác nhận thu hồi / cấp lại chứng nhận (tự dựng, không dùng alert/confirm của trình duyệt). Bắt buộc nhập lý do.
export function RevokeCertificateDialog({
  target,
  mode = "revoke",
  loading,
  onClose,
  onConfirm,
}: {
  target: RevokeCertificateTarget | null;
  mode?: "revoke" | "reissue";
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <Dialog.Root open={target !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        {/* key theo mã chứng nhận + chế độ để xóa lý do đã nhập khi mở cho chứng nhận khác. */}
        {target ? <ReasonForm key={`${mode}:${target.code}`} loading={loading} mode={mode} onClose={onClose} onConfirm={onConfirm} target={target} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ReasonForm({
  target,
  mode,
  loading,
  onClose,
  onConfirm,
}: {
  target: RevokeCertificateTarget;
  mode: "revoke" | "reissue";
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const missingReason = !reason.trim();
  const revoke = mode === "revoke";

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${revoke ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
            {revoke ? <ProhibitInset size={20} weight="bold" /> : <ArrowsCounterClockwise size={20} weight="bold" />}
          </span>
          <div>
            <Dialog.Title className="text-lg font-semibold text-foreground">{revoke ? "Thu hồi chứng nhận" : "Cấp lại chứng nhận"}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
              Chứng nhận <span className="font-semibold text-foreground">{target.code}</span>
              {target.leaderName ? <> của <span className="font-semibold text-foreground">{target.leaderName}</span></> : null}
              {target.courseName ? <> (khóa {target.courseName})</> : null} sẽ {revoke ? "bị thu hồi" : "được cấp lại"}.
            </Dialog.Description>
          </div>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>

      {revoke ? (
        <ul className="mt-4 list-disc space-y-1 rounded-[10px] border border-danger/20 bg-danger/5 py-3 pl-8 pr-3 text-sm text-foreground">
          <li>Hồ sơ của khóa huấn luyện liên kết sẽ chuyển thành <span className="font-semibold">Không đạt</span>, dù điểm cao hơn điểm đạt.</li>
          <li>Huynh trưởng được <span className="font-semibold">hạ về cấp trước đó</span> đã đạt (nếu khóa này đã thăng cấp cho họ).</li>
          <li>Nếu huynh trưởng còn chứng nhận cấp cao hơn, phải thu hồi chứng nhận cấp cao nhất trước.</li>
          <li>Không thể xuất PDF, duyệt lại hay sửa điểm; người có quyền cấp lại mới mở lại được.</li>
        </ul>
      ) : (
        <ul className="mt-4 list-disc space-y-1 rounded-[10px] border border-success/25 bg-success/5 py-3 pl-8 pr-3 text-sm text-foreground">
          <li>Chứng nhận trở lại <span className="font-semibold">Đã duyệt</span> (giữ nguyên người ký cũ), hồ sơ của khóa trở lại đạt.</li>
          <li>Nếu khóa đã kết thúc, huynh trưởng được <span className="font-semibold">thăng cấp lại</span> theo chứng nhận.</li>
          <li>Phải cấp lại từ chứng nhận cấp thấp nhất đang bị thu hồi của huynh trưởng trước.</li>
        </ul>
      )}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-foreground">
          {revoke ? "Lý do thu hồi" : "Lý do cấp lại"} <span className="text-danger">*</span>
        </span>
        <textarea
          autoFocus
          className={`${textareaClass} min-h-28`}
          onChange={(event) => setReason(event.target.value)}
          placeholder={revoke ? "Nhập lý do thu hồi (bắt buộc)" : "Nhập lý do cấp lại (bắt buộc)"}
          value={reason}
        />
      </label>

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={missingReason} loading={loading} onClick={() => onConfirm(reason.trim())} type="button" variant={revoke ? "destructive" : "primary"}>
          {revoke ? "Thu hồi chứng nhận" : "Cấp lại chứng nhận"}
        </Button>
      </div>
    </Dialog.Content>
  );
}
