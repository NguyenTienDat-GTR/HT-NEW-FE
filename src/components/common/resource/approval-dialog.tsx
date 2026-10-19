"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle, XCircle, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ApprovalDialog({
  loading,
  onClose,
  onConfirm,
  open,
  mode = "approve",
}: {
  loading?: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  open: boolean;
  mode?: "approve" | "reject";
}) {
  const [note, setNote] = useState("");
  const reject = mode === "reject";
  // Từ chối phải nêu lý do.
  const missingReason = reject && !note.trim();
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border bg-white p-5 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${reject ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
                {reject ? <XCircle size={20} weight="bold" /> : <CheckCircle size={20} weight="bold" />}
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">{reject ? "Từ chối duyệt hồ sơ" : "Duyệt hồ sơ"}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                  {reject ? "Nhập lý do từ chối duyệt." : "Nhập ghi chú hoặc lý do ngoại lệ nếu cần."}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <textarea
            className="mt-4 min-h-28 w-full rounded-[8px] border border-border bg-white px-3 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
            onChange={(event) => setNote(event.target.value)}
            placeholder={reject ? "Lý do từ chối (bắt buộc)" : "Ghi chú duyệt"}
            value={note}
          />
          <div className="mt-5 flex justify-end gap-3">
            <Button onClick={onClose} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={missingReason} loading={loading} onClick={() => onConfirm(note)} type="button" variant={reject ? "destructive" : "primary"}>
              {reject ? "Từ chối" : "Duyệt"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
