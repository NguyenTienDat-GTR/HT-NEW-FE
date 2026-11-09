"use client";

import { SealWarning } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { invalidateDataQueries } from "@/lib/api/query-keys";

// Hồ sơ đã chấm điểm nhưng không đạt, khóa có cấp độ đạt được và chưa có chứng nhận đang xử lý: được tạo chứng nhận ngoại lệ.
export function canCreateExceptionCertificate(row: Record<string, unknown>) {
  const level = row.courseResultingLevel;
  const hasLevel = typeof level === "string" && level !== "" && level !== "NONE";
  const certificateStatus = row.certificateApprovalStatus;
  const free = certificateStatus === undefined || certificateStatus === null || certificateStatus === "NOT_REQUIRED" || certificateStatus === "REJECTED";
  return (
    hasLevel &&
    row.approvalStatus === "APPROVED" &&
    row.result === "UNCOMPLETED" &&
    row.totalScore !== null &&
    row.totalScore !== undefined &&
    free &&
    row.courseFinished !== true &&
    row.coursePast !== true
  );
}

// Nút ở tab chấm điểm: tạo chứng nhận ngoại lệ (chờ duyệt ở tab duyệt chứng nhận, người duyệt bắt buộc nhập lý do).
export function ExceptionCertificateAction({ rowId, row }: { rowId: string; row: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const name = String(row.leaderFullName ?? "hồ sơ này");
  const mutation = useMutation({
    mutationFn: () => apiMutation(`/training/participations/${encodeURIComponent(rowId)}/exception-certificate`, "POST", {}),
    onSuccess: async () => {
      toast.success("Đã tạo chứng nhận ngoại lệ, chứng nhận chờ duyệt ở tab Duyệt chứng nhận");
      await invalidateDataQueries(queryClient);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function create() {
    if (!window.confirm(`Tạo chứng nhận ngoại lệ cho ${name}? Hồ sơ không đạt nhưng chứng nhận sẽ chờ người duyệt quyết định (bắt buộc nhập lý do khi duyệt).`)) return;
    mutation.mutate();
  }

  return (
    <Tip label="Tạo chứng nhận ngoại lệ (hồ sơ không đạt)">
      <Button aria-label="Tạo chứng nhận ngoại lệ" className="h-8 min-w-8 rounded-lg text-warning" disabled={mutation.isPending} onClick={create} size="icon" type="button" variant="icon">
        <SealWarning size={16} />
      </Button>
    </Tip>
  );
}
