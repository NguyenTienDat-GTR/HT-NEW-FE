"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Warning, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConfirmActionDialog({
  loading,
  onClose,
  onConfirm,
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  requireConfirmText = true,
}: {
  action: "toggle" | "withdraw";
  description?: string;
  confirmLabel?: string;
  requireConfirmText?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const [text, setText] = useState("");
  const canConfirm = !requireConfirmText || text === "Xác nhận";

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
                <Warning size={20} weight="bold" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                  {description ?? (
                    <>
                      Nhập chính xác <span className="font-medium text-foreground">Xác nhận</span> để đổi trạng thái bản ghi.
                    </>
                  )}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          {requireConfirmText ? (
            <div className="mt-4">
              <Input autoFocus onChange={(event) => setText(event.target.value)} placeholder="Xác nhận" value={text} />
            </div>
          ) : null}
          <div className="mt-5 flex justify-end gap-3">
            <Button onClick={onClose} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={!canConfirm} loading={loading} onClick={onConfirm} type="button" variant="primary">
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
