"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ShieldCheck, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "../hooks";
import { notificationDetail } from "../notification-meta";

const decisionLabels: Record<string, string> = {
  REGISTRATION_APPROVED: "Hồ sơ được duyệt",
  REGISTRATION_AUTO_APPROVED: "Hồ sơ được tự động duyệt",
  REGISTRATION_REJECTED: "Hồ sơ không được duyệt",
  CERTIFICATE_APPROVED: "Chứng nhận được duyệt",
  CERTIFICATE_REJECTED: "Chứng nhận không được duyệt",
  CERTIFICATE_REVOKED: "Chứng nhận bị thu hồi",
  CERTIFICATE_REISSUED: "Chứng nhận được cấp lại",
};

/** Modal danh sách của thông báo gom nhóm (hồ sơ/chứng nhận theo khóa) hoặc thông báo được phân quyền. */
export function NotificationDetailModal({
  item,
  onClose,
  onViewPermissions,
  onOpenTarget,
}: {
  item: NotificationItem | null;
  onClose: () => void;
  onViewPermissions?: () => void;
  // Mở màn hình liên quan (khóa huấn luyện / chứng nhận) của thông báo kết quả hồ sơ.
  onOpenTarget?: () => void;
}) {
  const detail = item ? notificationDetail(item) : null;
  const isPermission = detail?.kind === "PERMISSION_GRANT" || detail?.kind === "PERMISSION_REVOKE";
  return (
    <Dialog.Root onOpenChange={(open) => (!open ? onClose() : undefined)} open={Boolean(item && detail)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(640px,calc(100dvh-48px))] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold leading-6 text-foreground">{item?.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] leading-5 text-text-secondary">
                {detail?.heading ? <span className="font-medium text-foreground">{detail.heading}</span> : null}
                {detail?.decision && decisionLabels[detail.decision] ? <span> · {decisionLabels[detail.decision]}</span> : null}
                {detail?.actorName ? <span> · Thực hiện bởi {detail.actorName}</span> : null}
                {isPermission && detail?.targetName ? (
                  <span>
                    {" · "}
                    {detail.targetType === "ROLE" ? "Vai trò " : "Tài khoản "}
                    {detail.targetName}
                  </span>
                ) : null}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Đóng" className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-foreground">
              <X size={18} />
            </Dialog.Close>
          </div>

          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {(detail?.items ?? []).map((entry, index) => (
              <li className="px-5 py-3" key={`${entry.label}-${index}`}>
                <p className="text-sm font-medium text-foreground">
                  <span className="mr-2 text-xs font-semibold text-muted">{index + 1}.</span>
                  {entry.label}
                </p>
                {entry.detail ? <p className="mt-0.5 pl-6 text-[13px] text-text-secondary">{entry.detail}</p> : null}
                {entry.note ? <p className="mt-0.5 pl-6 text-[13px] text-danger">Lý do: {entry.note}</p> : null}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
            <span className="text-xs text-muted">{detail?.items.length ?? 0} mục</span>
            <div className="flex gap-2">
              {detail?.kind === "DECISION_LIST" && onOpenTarget ? (
                <Button onClick={onOpenTarget} type="button">
                  {item?.eventType?.startsWith("training.certificate.") ? "Xem chứng nhận" : "Mở khóa huấn luyện"}
                </Button>
              ) : null}
              {isPermission && onViewPermissions ? (
                <Button onClick={onViewPermissions} type="button">
                  <ShieldCheck size={18} weight="bold" />
                  Xem quyền hiện có
                </Button>
              ) : null}
              <Button onClick={onClose} type="button" variant="outline">
                Đóng
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
