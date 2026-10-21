"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Power, Warning, X } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import type { UnitToggleImpact } from "../types";

// Tắt / bật lại giáo phận, giáo hạt, giáo xứ: hiện bảng tác động trước, bắt buộc nhập lý do khi tắt và gõ "Xác nhận".
// Tắt đơn vị không xóa hay đổi trạng thái dữ liệu con: tài khoản chỉ còn đọc thông báo, dữ liệu bị đóng băng, bật lại là khôi phục.
export function UnitToggleDialog({
  endpoint,
  onClose,
  unitId,
  unitLabel,
  unitName,
}: {
  endpoint: string;
  onClose: () => void;
  unitId: string | null;
  unitLabel: string;
  unitName?: string;
}) {
  return (
    <Dialog.Root open={unitId !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        {/* key theo id để xóa chữ đã nhập khi mở cho đơn vị khác. */}
        {unitId ? <ToggleForm endpoint={endpoint} key={unitId} onClose={onClose} unitId={unitId} unitLabel={unitLabel} unitName={unitName} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const MAX_REASON_LENGTH = 500;

export function canSubmitUnitToggle({ confirmText, disabling, impactLoaded, reason }: { confirmText: string; disabling: boolean; impactLoaded: boolean; reason: string }) {
  if (!impactLoaded || confirmText.trim() !== "Xác nhận") return false;
  if (!disabling) return true;
  const trimmed = reason.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_REASON_LENGTH;
}

function ToggleForm({ endpoint, onClose, unitId, unitLabel, unitName }: { endpoint: string; onClose: () => void; unitId: string; unitLabel: string; unitName?: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");

  const impactQuery = useQuery({
    queryKey: ["unit-toggle-impact", endpoint, unitId],
    queryFn: () => apiFetch<UnitToggleImpact>(`${endpoint}/${encodeURIComponent(unitId)}/toggle-impact`),
    staleTime: 0,
    gcTime: 0,
  });
  const impact = impactQuery.data;
  const disabling = impact?.currentlyActive === true;

  const mutation = useMutation({
    mutationFn: () =>
      apiMutation(`${endpoint}/${encodeURIComponent(unitId)}/toggle-status`, "PATCH", {
        confirmationText: text.trim(),
        reason: disabling ? reason.trim() : undefined,
      }),
    onSuccess: async () => {
      toast.success(disabling ? `Đã ngưng hoạt động ${unitLabel}` : `Đã bật lại ${unitLabel}`);
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["unit-status-history"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      onClose();
    },
  });

  const canConfirm = canSubmitUnitToggle({ confirmText: text, disabling, impactLoaded: impact !== undefined, reason });

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${disabling ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
            {disabling ? <Warning size={20} weight="bold" /> : <Power size={20} weight="bold" />}
          </span>
          <div>
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {impact === undefined ? `Đổi trạng thái ${unitLabel}` : disabling ? `Ngưng hoạt động ${unitLabel}` : `Bật lại ${unitLabel}`}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
              {unitName ? <span className="font-semibold text-foreground">{unitName}</span> : null}
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

      {impact && disabling ? <DisableImpact impact={impact} /> : null}

      {impact && !disabling ? (
        <ul className="mt-4 list-disc space-y-1 rounded-lg border border-success/25 bg-success/5 py-3 pl-8 pr-3 text-sm text-foreground">
          <li>Tài khoản thuộc đơn vị (và đơn vị con đang bật) đăng nhập và thao tác bình thường trở lại.</li>
          <li>Dữ liệu được mở khóa đúng như trước khi tắt; tài khoản đã bị khóa riêng vẫn giữ nguyên trạng thái khóa.</li>
        </ul>
      ) : null}

      {impact && disabling ? (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm text-foreground">
            Lý do ngưng hoạt động <span className="text-danger">*</span>
          </span>
          <textarea
            className="min-h-[72px] w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            maxLength={MAX_REASON_LENGTH}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ví dụ: sáp nhập giáo xứ, tạm ngưng theo quyết định…"
            value={reason}
          />
        </label>
      ) : null}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm text-foreground">
          Nhập chính xác <span className="font-semibold">Xác nhận</span> để {disabling ? "ngưng hoạt động" : "bật lại"} {unitLabel}
        </span>
        <Input autoFocus onChange={(event) => setText(event.target.value)} placeholder="Xác nhận" value={text} />
      </label>

      <div className="mt-5 flex justify-end gap-3">
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={!canConfirm} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button" variant={disabling ? "destructive" : "primary"}>
          {disabling ? "Ngưng hoạt động" : "Bật lại"}
        </Button>
      </div>
    </Dialog.Content>
  );
}

function DisableImpact({ impact }: { impact: UnitToggleImpact }) {
  const rows: Array<[string, number]> = [
    ["Giáo hạt con đang bật", impact.childDeaneries],
    ["Giáo xứ con đang bật", impact.childParishes],
    ["Tài khoản bị khóa", impact.affectedAccounts],
    ["Huynh trưởng", impact.leaders],
    ["Khóa chưa kết thúc", impact.openCourses],
    ["Đăng ký chờ duyệt", impact.pendingRegistrations],
    ["Chứng nhận chờ duyệt", impact.pendingCertificates],
  ];
  return (
    <div className="mt-4 space-y-3">
      <dl className="grid grid-cols-2 gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm">
        {rows
          .filter(([, value]) => value > 0)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className="font-semibold text-foreground">{value}</dd>
            </div>
          ))}
      </dl>
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
        <li>Tài khoản thuộc đơn vị chỉ còn đăng nhập và đọc thông báo; trạng thái riêng của từng tài khoản không bị đổi.</li>
        <li>Dữ liệu bị đóng băng (chỉ xem): không thêm huynh trưởng, đăng ký mới hay phân công chức vụ trong đơn vị. Không xóa dữ liệu nào.</li>
        <li>Chứng nhận đã cấp vẫn hợp lệ. Khóa do đơn vị khác tổ chức vẫn được hoàn tất hồ sơ đã đăng ký.</li>
        <li>Bật lại đơn vị sẽ khôi phục toàn bộ như cũ.</li>
      </ul>
    </div>
  );
}
