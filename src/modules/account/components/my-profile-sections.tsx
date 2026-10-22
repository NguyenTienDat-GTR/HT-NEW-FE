"use client";

import { Certificate as CertificateIcon, ClockCounterClockwise, Eye } from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { formatLeaderLevel } from "@/components/common/resource/resource-format";
import { ViewModeToggle, type ViewMode } from "@/components/common/resource/view-mode-toggle";
import { CertificateCard } from "@/modules/certificates/components/certificate-card";
import { CertificateDetailDrawer } from "@/modules/certificates/components/certificate-detail-drawer";
import {
  formatDate,
  workflowLabel,
  yearFromDate,
  type CertificateRow,
  type RankHistoryRow,
} from "@/modules/leaders/components/leader-detail-utils";
import { MY_CERTIFICATE_ENDPOINT } from "../account-api";

type IconType = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" | "duotone" }>;

export function SectionTitle({ icon: Icon, title, action }: { icon: IconType; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        <Icon aria-hidden className="h-[18px] w-[18px] text-primary" weight="bold" />
        {title}
      </h3>
      {action}
    </div>
  );
}

/** Lịch sử cấp độ: mới nhất ở trên, dạng dòng thời gian giống hồ sơ Huynh Trưởng. */
export function RankHistorySection({ histories }: { histories: RankHistoryRow[] }) {
  const items = [...histories].sort((left, right) => yearFromDate(right.promotionDate) - yearFromDate(left.promotionDate));
  return (
    <Panel className="p-4 sm:p-5">
      <SectionTitle icon={ClockCounterClockwise} title="Lịch sử cấp độ" />
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Chưa có lịch sử cấp độ.</p>
      ) : (
        <ol className="relative mt-4 space-y-3 before:absolute before:bottom-3 before:left-[9px] before:top-3 before:w-px before:bg-border">
          {items.map((history, index) => (
            <li className="relative flex items-start gap-3" key={history.id ?? `${history.newLevel}-${history.promotionDate}-${index}`}>
              <span
                aria-hidden
                className={
                  index === 0
                    ? "relative z-10 mt-3 h-[19px] w-[19px] shrink-0 rounded-full border-4 border-primary-soft bg-primary"
                    : "relative z-10 mt-3 h-[19px] w-[19px] shrink-0 rounded-full border-4 border-white bg-slate-300"
                }
              />
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-white px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {history.newLevel ? formatLeaderLevel(history.newLevel) : "Cấp độ chưa rõ"}
                  {index === 0 ? (
                    <span className="ml-2 inline-flex h-5 items-center rounded-full bg-primary-soft px-2 text-[11px] font-medium text-primary">
                      Hiện tại
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {history.oldLevel ? `Từ ${formatLeaderLevel(history.oldLevel)} · ` : ""}
                  {history.promotionDate ? `Năm ${yearFromDate(history.promotionDate)}` : "Chưa có năm ghi nhận"}
                </p>
                {history.note ? <p className="mt-1 text-xs text-muted">{history.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/** Chứng nhận của chính mình: thẻ hoặc bảng, mở chi tiết qua endpoint tự phục vụ. */
export function CertificatesSection({ certificates }: { certificates: CertificateRow[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [viewingCode, setViewingCode] = useState<string | null>(null);

  return (
    <Panel className="p-4 sm:p-5">
      <SectionTitle
        action={certificates.length ? <ViewModeToggle mode={viewMode} onChange={setViewMode} /> : undefined}
        icon={CertificateIcon}
        title={`Chứng nhận (${certificates.length})`}
      />
      {certificates.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Chưa có chứng nhận.</p>
      ) : viewMode === "card" ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {certificates.map((row, index) => (
            <li key={row.certificateCode ?? index}>
              <CertificateCard
                data={row}
                onOpen={row.certificateCode ? () => setViewingCode(row.certificateCode ?? null) : undefined}
                showHolder={false}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                {["Chứng nhận", "Khóa học", "Ngày cấp", "Trạng thái", "Xem"].map((column) => (
                  <th className="px-4 py-2.5 font-semibold" key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificates.map((row, index) => (
                <tr className="transition-colors hover:bg-surface-hover" key={row.certificateCode ?? index}>
                  <td className="px-4 py-3 font-medium text-foreground">{row.certificateName ?? row.certificateCode}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.courseName ?? row.courseCode}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(row.issueDate)}</td>
                  <td className="px-4 py-3 text-text-secondary">{workflowLabel(row.approvalStatus)}</td>
                  <td className="px-4 py-3">
                    {row.certificateCode ? (
                      <Button
                        aria-label="Xem chi tiết chứng nhận"
                        className="h-8 min-w-8 rounded-lg"
                        onClick={() => setViewingCode(row.certificateCode ?? null)}
                        size="icon"
                        type="button"
                        variant="icon"
                      >
                        <Eye size={16} />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CertificateDetailDrawer endpoint={MY_CERTIFICATE_ENDPOINT} id={viewingCode} onClose={() => setViewingCode(null)} />
    </Panel>
  );
}
