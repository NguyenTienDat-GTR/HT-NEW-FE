"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle, DownloadSimple, Warning, WarningCircle, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { groupIssues, issuesToCsv, summarizeInvitation } from "../invitation-summary";
import { saveBlob } from "../api";
import type { InvitationResult } from "../types";

const toneStyles = {
  success: { box: "border-success/30 bg-success/10", icon: <CheckCircle className="text-success" size={22} weight="fill" /> },
  warning: { box: "border-warning/40 bg-warning/10", icon: <Warning className="text-warning" size={22} weight="fill" /> },
  danger: { box: "border-danger/30 bg-danger/5", icon: <WarningCircle className="text-danger" size={22} weight="fill" /> },
} as const;

// Kết quả gửi email thông tin tham dự: nêu số đã gửi và liệt kê, theo nhóm lý do, các hồ sơ không có email / email lỗi / gửi lỗi
// để người dùng bổ sung rồi gửi lại. Danh sách lỗi tải về được dạng CSV.
export function InvitationResultDialog({ result, courseName, onClose }: { result: InvitationResult | null; courseName?: string; onClose: () => void }) {
  const summary = result ? summarizeInvitation(result) : null;
  const groups = result ? groupIssues(result.issues) : [];
  const style = summary ? toneStyles[summary.tone] : null;

  function downloadIssues() {
    if (!result) return;
    saveBlob(new Blob([issuesToCsv(result.issues)], { type: "text/csv;charset=utf-8" }), `Ho-so-chua-gui-email${courseName ? ` - ${courseName}` : ""}.csv`.replace(/[\\/:*?"<>|]/g, " "));
  }

  return (
    <Dialog.Root onOpenChange={(open) => (open ? undefined : onClose())} open={result !== null}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(94vw,640px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Kết quả gửi email thông tin tham dự</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                {result ? `Đã xét ${result.total} hồ sơ${result.includeQr ? " · có kèm mã QR điểm danh" : " · không kèm mã QR"}.` : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {summary && style ? (
              <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", style.box)} role="status">
                {style.icon}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{summary.headline}</p>
                  {summary.details.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-text-secondary">
                      {summary.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : null}

            {groups.map((group) => (
              <section key={group.category}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  {group.label} ({group.issues.length})
                </h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {group.issues.map((issue, index) => (
                    <li className="px-3 py-2 text-[13px]" key={`${issue.participationId ?? "x"}-${index}`}>
                      <p className="font-medium text-foreground">{[issue.holyName, issue.fullName].filter(Boolean).join(" ") || "Hồ sơ không xác định"}</p>
                      <p className="text-text-secondary">
                        {issue.email ? <span className="mr-2 break-all">{issue.email}</span> : null}
                        <span className="text-danger">{issue.reason}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {result && result.issues.length > 0 ? (
              <p className="text-xs text-muted">Bổ sung hoặc sửa email ở hồ sơ huynh trưởng rồi bấm “Gửi email” lại — chỉ những hồ sơ chưa gửi được sẽ được gửi.</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <Button disabled={!result || result.issues.length === 0} onClick={downloadIssues} type="button" variant="outline">
              <DownloadSimple size={16} /> Tải danh sách lỗi (CSV)
            </Button>
            <Dialog.Close asChild>
              <Button type="button">Đóng</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
