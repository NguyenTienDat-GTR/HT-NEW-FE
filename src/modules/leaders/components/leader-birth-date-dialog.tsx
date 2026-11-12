"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CalendarBlank, X } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { invalidateDataQueries } from "@/lib/api/query-keys";
import type { LeaderDetail } from "./leader-detail-utils";
import { todayDateText, validateBirthDate } from "./leader-edit";

type LeaderBirthDateDialogProps = {
  leader: LeaderDetail;
  leaderId: string;
  onUpdated: (updated: LeaderDetail) => void;
};

// Chỉ sửa ngày sinh: chức năng riêng (quyền organization.leader.update_birth_date.*) tách khỏi sửa hồ sơ.
export function LeaderBirthDateDialog(props: LeaderBirthDateDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline">
          <CalendarBlank size={18} />
          Sửa ngày sinh
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        {open ? <BirthDateContent {...props} onClose={() => setOpen(false)} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BirthDateContent({ leader, leaderId, onUpdated, onClose }: LeaderBirthDateDialogProps & { onClose: () => void }) {
  const [birthDate, setBirthDate] = useState(leader.birthDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const today = todayDateText();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<LeaderDetail>(`/leaders/${encodeURIComponent(leaderId)}/birth-date`, { method: "PATCH", body: JSON.stringify({ birthDate }) }),
    onSuccess: async (updated) => {
      toast.success("Cập nhật ngày sinh thành công");
      onClose();
      onUpdated(updated);
      await invalidateDataQueries(queryClient);
    },
    onError: (apiError) => toast.error(getApiErrorMessage(apiError)),
  });

  const submit = () => {
    const nextError = validateBirthDate(birthDate, today);
    setError(nextError);
    if (!nextError) mutation.mutate();
  };

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[calc(100vw-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-xl focus:outline-none">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <Dialog.Title className="text-lg font-semibold text-foreground">Sửa ngày sinh</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
            Cập nhật ngày sinh của {leader.holyName ? `${leader.holyName} ` : ""}
            {leader.fullName}. Các thông tin khác của hồ sơ giữ nguyên.
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={20} />
          </Button>
        </Dialog.Close>
      </div>

      <form
        className="flex flex-col"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="block px-5 py-4">
          <span className="block text-sm font-semibold text-foreground">
            Ngày sinh <span className="text-danger">*</span>
          </span>
          <Input
            aria-invalid={error ? true : undefined}
            className="mt-2 h-10"
            max={today}
            onChange={(event) => {
              setBirthDate(event.target.value);
              setError(null);
            }}
            type="date"
            value={birthDate}
          />
          {error ? <span className="mt-1.5 block text-xs text-danger">{error}</span> : null}
        </label>

        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          <Button onClick={onClose} type="button" variant="outline">
            Hủy
          </Button>
          <Button loading={mutation.isPending} type="submit" variant="primary">
            Lưu
          </Button>
        </div>
      </form>
    </Dialog.Content>
  );
}
