"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowsLeftRight, X } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form/resource-form/form-controls";
import type { FormFieldSpec } from "@/components/form/resource-form/types";
import { Button } from "@/components/ui/button";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { resourceKey } from "@/lib/api/query-keys";
import { parishOptionLabel } from "../parish-option-label";
import type { LeaderDetail } from "./leader-detail-utils";

type LeaderTransferDialogProps = {
  leader: LeaderDetail;
  leaderId: string;
  endpoint: string;
  onTransferred: (updated: LeaderDetail) => void;
};

// Chuyển huynh trưởng sang giáo xứ khác: chức năng riêng (quyền riêng) tách khỏi sửa hồ sơ.
export function LeaderTransferDialog({ leader, leaderId, endpoint, onTransferred }: LeaderTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [parishId, setParishId] = useState("");
  const queryClient = useQueryClient();

  const field: FormFieldSpec = {
    name: "parishId",
    label: "Giáo xứ / giáo họ / giáo điểm mới",
    type: "select",
    searchable: true,
    required: true,
    optionsEndpoint: "/parishes",
    optionValue: "id",
    optionLabel: "name",
    optionLabelBuilder: parishOptionLabel,
    excludeOptionValues: leader.parishId ? [leader.parishId] : [],
  };

  const mutation = useMutation({
    mutationFn: () => apiFetch<LeaderDetail>(`/leaders/${encodeURIComponent(leaderId)}/transfer`, { method: "POST", body: JSON.stringify({ parishId }) }),
    onSuccess: async (updated) => {
      toast.success("Chuyển giáo xứ thành công");
      setOpen(false);
      setParishId("");
      onTransferred(updated);
      await queryClient.invalidateQueries({ queryKey: resourceKey(endpoint) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setParishId("");
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline">
          <ArrowsLeftRight size={18} />
          Chuyển xứ
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Chuyển giáo xứ</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                Chuyển {leader.holyName ? `${leader.holyName} ` : ""}{leader.fullName} từ {leader.parishName ?? "giáo xứ hiện tại"} sang đơn vị khác. Các tài khoản xem hồ sơ huynh trưởng của hai đơn vị sẽ nhận thông báo.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-4">
            <FormField field={field} mode="edit" onChange={(value) => setParishId(String(value ?? ""))} value={parishId} />
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={!parishId} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button" variant="primary">
              Chuyển
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
