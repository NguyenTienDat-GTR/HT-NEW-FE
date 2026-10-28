"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { candidateName } from "../send-form";
import { CourseInfoBlock } from "./course-info";
import type { CrossRequest } from "../types";

// Giáo hạt nhà đồng ý (cả yêu cầu hoặc chọn từng hồ sơ) hoặc từ chối. Từ chối hoặc đồng ý một phần phải nhập ghi chú.
export function DecisionDialog({
  request,
  approve,
  loading,
  onClose,
  onSubmit,
}: {
  request: CrossRequest;
  approve: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (body: { approved: boolean; note: string; itemIds: string[] }) => void;
}) {
  const pending = request.items.filter((item) => item.itemStatus === "PENDING");
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries(pending.map((item) => [item.id, true])));
  const [note, setNote] = useState("");
  const itemIds = approve ? pending.filter((item) => checked[item.id]).map((item) => item.id) : [];
  const partial = approve && itemIds.length > 0 && itemIds.length < pending.length;
  const noteRequired = !approve || partial;
  const valid = (approve ? itemIds.length > 0 : true) && (!noteRequired || note.trim().length > 0);

  return (
    <Dialog.Root onOpenChange={(open) => (open ? undefined : onClose())} open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">{approve ? "Đồng ý gửi sang giáo hạt khác" : "Từ chối yêu cầu"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                {request.parishName ?? "Giáo hạt"} gửi {pending.length} hồ sơ sang khóa {request.courseName}
                {request.courseDeaneryName ? ` của ${request.courseDeaneryName}` : ""}.{" "}
                {approve ? "Hồ sơ được đồng ý sẽ chờ giáo hạt tổ chức khóa duyệt." : "Tất cả hồ sơ trong yêu cầu sẽ bị từ chối."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="space-y-3 overflow-y-auto px-5 py-4">
            <CourseInfoBlock hostDeaneryName={request.courseDeaneryName} info={request.course} />
            <ul className="space-y-2">
              {pending.map((item) => (
                <li className="rounded-lg border border-border p-2.5 text-sm" key={item.id}>
                  <label className="flex items-start gap-3">
                    {approve ? (
                      <input
                        checked={Boolean(checked[item.id])}
                        className="mt-1 h-4 w-4 accent-primary"
                        onChange={(event) => setChecked((current) => ({ ...current, [item.id]: event.target.checked }))}
                        type="checkbox"
                      />
                    ) : null}
                    <span className="min-w-0">
                      <span className="font-semibold text-foreground">{candidateName(item)}</span>
                      <span className="block text-xs text-muted">Lí do gửi: {item.reason}</span>
                      {item.exceptionReason ? <span className="block text-xs text-muted">Lí do ngoại lệ: {item.exceptionReason}</span> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <label className="block text-xs font-semibold uppercase tracking-[0.02em] text-muted">
              Ghi chú {noteRequired ? <span className="text-danger">*</span> : "(tùy chọn)"}
              <textarea
                className="mt-1 min-h-16 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]"
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder={approve ? "Bắt buộc khi chỉ đồng ý một phần hồ sơ" : "Lí do từ chối"}
                value={note}
              />
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
            <Button onClick={onClose} type="button" variant="outline">
              Hủy
            </Button>
            <Button
              disabled={!valid}
              loading={loading}
              onClick={() => onSubmit({ approved: approve, note: note.trim(), itemIds })}
              type="button"
              variant={approve ? "primary" : "destructive"}
            >
              {approve ? `Đồng ý ${itemIds.length} hồ sơ` : "Từ chối"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
