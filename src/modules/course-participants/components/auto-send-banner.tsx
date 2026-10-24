"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { fetchSummary, participantKeys, sendInvitations } from "../api";
import type { InvitationResult } from "../types";
import { InvitationResultDialog } from "./invitation-result-dialog";

// Khóa bật "tự gửi email khi duyệt" nhưng vẫn còn hồ sơ đã duyệt từ trước chưa được gửi (duyệt trước khi bật cờ, hoặc gửi lỗi):
// hỏi người dùng có gửi bù ngay không. Hồ sơ đã gửi thành công không bị gửi lại.
export function AutoSendBanner({ courseCode, courseName, attendanceEnabled }: { courseCode: string; courseName?: string; attendanceEnabled: boolean }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const summaryQuery = useQuery({ queryKey: participantKeys.summary(courseCode), queryFn: () => fetchSummary(courseCode) });
  // Hồ sơ không có email hợp lệ vẫn tính là "chưa gửi" nhưng gửi bù chỉ gom được các hồ sơ còn lại.
  const reachable = Math.max(0, (summaryQuery.data?.invitationPending ?? 0) - (summaryQuery.data?.withoutEmail ?? 0));

  const sendMutation = useMutation({
    mutationFn: () => sendInvitations(courseCode, { includeQr: attendanceEnabled, resend: false }),
    onMutate: () => ({ toastId: toast.loading("Đang gửi email thông tin tham dự…") }),
    onSuccess: async (job, _vars, context) => {
      toast.dismiss(context?.toastId);
      setResult(job.result ?? null);
      await queryClient.invalidateQueries({ queryKey: participantKeys.all(courseCode) });
    },
    onError: (error, _vars, context) => toast.error(getApiErrorMessage(error), { id: context?.toastId, duration: 10000 }),
  });

  if (dismissed && !result) return null;
  if (reachable === 0 && !result) return null;

  return (
    <>
      {reachable > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm text-foreground" role="status">
          <EnvelopeSimple className="shrink-0 text-info" size={20} weight="fill" />
          <p className="min-w-0 flex-1">
            Khóa đang bật <span className="font-semibold">tự gửi email thông tin tham dự</span> khi duyệt. Còn <span className="font-semibold">{reachable} hồ sơ</span> đã duyệt từ trước chưa được gửi email
            {attendanceEnabled ? " (kèm mã QR điểm danh)" : ""}. Gửi bù ngay?
          </p>
          <Button loading={sendMutation.isPending} onClick={() => sendMutation.mutate()} size="sm" type="button">
            Gửi cho {reachable} hồ sơ
          </Button>
          <Button onClick={() => setDismissed(true)} size="sm" type="button" variant="ghost">
            Để sau
          </Button>
        </div>
      ) : null}
      <InvitationResultDialog courseName={courseName} onClose={() => setResult(null)} result={result} />
    </>
  );
}
