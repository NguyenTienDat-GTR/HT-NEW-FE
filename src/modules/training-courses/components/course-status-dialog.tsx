"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Power, Warning, X } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";

type StatusImpact = { active: boolean; approvedCertificates: number; restorableCertificates: number };

// Vô hiệu hóa / bật lại khóa huấn luyện: cảnh báo tác động (số chứng nhận bị thu hồi / được mở lại) và bắt buộc gõ "Xác nhận".
// BE kiểm tra lại chữ "Xác nhận" và trạng thái đích, nên trạng thái đã đổi ở nơi khác sẽ báo lỗi chứ không đổi nhầm.
export function CourseStatusDialog({
  courseCode,
  courseName,
  endpoint,
  onClose,
}: {
  courseCode: string | null;
  courseName?: string;
  endpoint: string;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={courseCode !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        {/* key theo mã khóa để xóa chữ đã nhập khi mở cho khóa khác. */}
        {courseCode ? <StatusForm courseCode={courseCode} courseName={courseName} endpoint={endpoint} key={courseCode} onClose={onClose} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StatusForm({ courseCode, courseName, endpoint, onClose }: { courseCode: string; courseName?: string; endpoint: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const impactQuery = useQuery({
    queryKey: ["course-status-impact", endpoint, courseCode],
    queryFn: () => apiFetch<StatusImpact>(`${endpoint}/${encodeURIComponent(courseCode)}/status-impact`),
    staleTime: 0,
    gcTime: 0,
  });
  const impact = impactQuery.data;
  // Trạng thái đích = ngược với trạng thái hiện tại; gửi kèm để BE đối chiếu.
  const disabling = impact?.active === true;

  const mutation = useMutation({
    mutationFn: () => apiMutation(`${endpoint}/${encodeURIComponent(courseCode)}/toggle-status`, "PATCH", { confirmationText: text.trim(), targetStatus: !disabling }),
    onSuccess: async () => {
      toast.success(disabling ? "Đã vô hiệu hóa khóa huấn luyện" : "Đã bật lại khóa huấn luyện");
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
      onClose();
    },
  });

  const canConfirm = impact !== undefined && text.trim() === "Xác nhận";

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${disabling ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
            {disabling ? <Warning size={20} weight="bold" /> : <Power size={20} weight="bold" />}
          </span>
          <div>
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {impact === undefined ? "Đổi trạng thái khóa huấn luyện" : disabling ? "Vô hiệu hóa khóa huấn luyện" : "Bật lại khóa huấn luyện"}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
              {courseName ? <span className="font-semibold text-foreground">{courseName}</span> : null}
              {impactQuery.isLoading ? " Đang kiểm tra tác động…" : null}
            </Dialog.Description>
          </div>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>

      {impactQuery.isError ? <p className="mt-4 text-sm text-danger">{getApiErrorMessage(impactQuery.error)}</p> : null}

      {impact && disabling ? (
        <ul className="mt-4 list-disc space-y-1 rounded-[10px] border border-danger/20 bg-danger/5 py-3 pl-8 pr-3 text-sm text-foreground">
          <li>Không thể thao tác bất cứ gì trong khóa này (đăng ký, duyệt, chấm điểm, kết thúc, sửa, duyệt chứng nhận) cho đến khi bật lại.</li>
          <li>
            {impact.approvedCertificates > 0 ? (
              <>
                <span className="font-semibold">{impact.approvedCertificates} chứng nhận đã duyệt</span> sẽ bị thu hồi (lý do: khóa huấn luyện bị vô hiệu hóa); hồ sơ liên kết thành không đạt
                và huynh trưởng được hạ về cấp trước đó đã đạt.
              </>
            ) : (
              "Khóa chưa có chứng nhận nào đã duyệt nên không có chứng nhận bị thu hồi."
            )}
          </li>
          <li>Khi bật lại, các chứng nhận bị thu hồi vì vô hiệu hóa này sẽ được mở lại; chứng nhận bị thu hồi vì lý do khác không bật lại.</li>
        </ul>
      ) : null}

      {impact && !disabling ? (
        <ul className="mt-4 list-disc space-y-1 rounded-[10px] border border-success/25 bg-success/5 py-3 pl-8 pr-3 text-sm text-foreground">
          <li>Khóa huấn luyện hoạt động trở lại, có thể thao tác bình thường.</li>
          <li>
            {impact.restorableCertificates > 0 ? (
              <>
                <span className="font-semibold">{impact.restorableCertificates} chứng nhận</span> bị thu hồi do vô hiệu hóa sẽ được mở lại, hồ sơ trở lại đạt và huynh trưởng được thăng cấp lại.
              </>
            ) : (
              "Không có chứng nhận nào bị thu hồi do vô hiệu hóa cần mở lại."
            )}
          </li>
          <li>Chứng nhận bị thu hồi vì lý do khác giữ nguyên, chỉ người có quyền cấp lại mới mở lại được.</li>
        </ul>
      ) : null}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm text-foreground">
          Nhập chính xác <span className="font-semibold">Xác nhận</span> để {disabling ? "vô hiệu hóa" : "bật lại"} khóa
        </span>
        <Input autoFocus onChange={(event) => setText(event.target.value)} placeholder="Xác nhận" value={text} />
      </label>

      <div className="mt-5 flex justify-end gap-3">
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={!canConfirm} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button" variant={disabling ? "destructive" : "primary"}>
          {disabling ? "Vô hiệu hóa khóa" : "Bật lại khóa"}
        </Button>
      </div>
    </Dialog.Content>
  );
}
