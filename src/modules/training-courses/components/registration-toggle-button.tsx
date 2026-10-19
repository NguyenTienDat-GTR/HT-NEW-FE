"use client";

import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { registrationStateLabels, resolveRegistrationState } from "../registration-state";

// Đóng/mở đăng ký thủ công khi khóa đang trong thời gian đăng ký (hết hạn/chưa đến giờ thì hệ thống tự xử lý).
export function RegistrationToggleButton({ endpoint, id, row }: { endpoint: string; id: string; row: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const state = resolveRegistrationState(row);
  const closed = state === "CLOSED";
  const toggleable = state === "OPEN" || state === "CLOSED";
  const mutation = useMutation({
    mutationFn: () => apiMutation(`${endpoint}/${encodeURIComponent(id)}/registration`, "PATCH", { open: closed }),
    onSuccess: async () => {
      toast.success(closed ? "Đã mở đăng ký" : "Đã đóng đăng ký");
      await queryClient.invalidateQueries({ queryKey: ["resource", endpoint] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const label = !toggleable
    ? state === "ENDED"
      ? `${registrationStateLabels.ENDED}, hãy gia hạn thời gian đăng ký để mở lại`
      : "Chưa đến giờ đăng ký, hệ thống sẽ tự mở khi đến giờ"
    : closed
      ? "Mở đăng ký"
      : "Đóng đăng ký";
  return (
    <Button aria-label={label} className="h-8 min-w-8 rounded-lg" disabled={!toggleable || mutation.isPending} onClick={() => mutation.mutate()} size="icon" title={label} type="button" variant="icon">
      {closed || !toggleable ? <LockSimpleIcon size={16} /> : <LockSimpleOpenIcon size={16} />}
    </Button>
  );
}
