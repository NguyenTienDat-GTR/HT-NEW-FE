"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Warning, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RegistrationEntry } from "@/components/form/resource-form/registration-list-field";
import { entryDisplayName } from "../off-target";

// Cảnh báo hồ sơ gửi ngoài đợt của khóa giáo phận: mỗi hồ sơ phải có lí do riêng thì mới được xác nhận gửi.
// Hồ sơ ngoài đợt luôn được duyệt thủ công (không tự duyệt).
export function OffTargetConfirmDialog({
  courseName,
  entries,
  loading,
  onCancel,
  onConfirm,
}: {
  courseName?: string;
  entries: RegistrationEntry[];
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reasons: Record<string, string>) => void;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>(() => Object.fromEntries(entries.map((entry) => [entry.id, entry.offTargetReason ?? ""])));
  const complete = entries.every((entry) => (reasons[entry.id] ?? "").trim().length > 0);

  return (
    <Dialog.Root onOpenChange={(open) => (open ? undefined : onCancel())} open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,680px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
                <Warning size={22} weight="bold" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">Hồ sơ gửi không đúng đợt</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                  {entries.length} hồ sơ thuộc giáo hạt mà khóa{courseName ? ` "${courseName}"` : ""} không dành cho. Bạn vẫn có thể gửi, nhưng mỗi hồ sơ phải kèm lí do riêng và sẽ được duyệt thủ công.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>

          <ul className="space-y-3 overflow-y-auto px-5 py-4">
            {entries.map((entry) => (
              <li className="rounded-lg border border-border p-3" key={entry.id}>
                <p className="text-sm font-semibold text-foreground">
                  {entryDisplayName(entry)}
                  <span className="ml-2 font-normal text-muted">{[entry.parishName, entry.deaneryName].filter(Boolean).join(" · ")}</span>
                </p>
                <label className="mt-2 block text-xs font-semibold uppercase tracking-[0.02em] text-muted" htmlFor={`off-target-${entry.id}`}>
                  Lí do gửi ngoài đợt <span className="text-danger">*</span>
                </label>
                <textarea
                  className="mt-1 min-h-16 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]"
                  id={`off-target-${entry.id}`}
                  maxLength={500}
                  onChange={(event) => setReasons((current) => ({ ...current, [entry.id]: event.target.value }))}
                  placeholder="Vì sao huynh trưởng này đăng ký ở đợt không dành cho giáo hạt của họ?"
                  value={reasons[entry.id] ?? ""}
                />
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
            <Button onClick={onCancel} type="button" variant="outline">
              Quay lại
            </Button>
            <Button disabled={!complete} loading={loading} onClick={() => onConfirm(reasons)} type="button">
              Xác nhận gửi
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
