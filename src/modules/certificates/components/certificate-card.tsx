"use client";

import { CalendarBlank, Certificate, GraduationCap, PenNib, User } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ResourceCell } from "@/components/common/resource/resource-format";
import { formatVietnamDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

export type CertificateCardData = {
  certificateCode?: string | null;
  certificateName?: string | null;
  leaderHolyName?: string | null;
  leaderFullName?: string | null;
  courseName?: string | null;
  courseCode?: string | null;
  issueDate?: string | null;
  signedBy?: string | null;
  approvalStatus?: string | null;
  totalScore?: number | string | null;
  scoreHidden?: boolean | null;
  passingScore?: number | string | null;
  passed?: boolean | null;
};

// Viền trên theo trạng thái duyệt: đã duyệt (xanh lá), chờ duyệt (vàng), từ chối/thu hồi (đỏ), còn lại (xám).
function accentClass(status?: string | null) {
  switch (status) {
    case "APPROVED":
      return "border-t-success";
    case "PENDING":
    case "SUBMITTED":
      return "border-t-warning";
    case "REJECTED":
    case "REVOKED":
      return "border-t-danger";
    default:
      return "border-t-slate-300";
  }
}

function scoreText(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isNaN(number) ? String(value) : number.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

type CertificateCardProps = {
  data: CertificateCardData;
  // Mở chi tiết: liên kết (trang) hoặc hàm (drawer).
  href?: string;
  onOpen?: () => void;
  // Hiện tên người nhận chứng nhận (ẩn khi đang xem trong hồ sơ của chính người đó).
  showHolder?: boolean;
  selection?: { checked: boolean; onToggle: () => void };
  footer?: ReactNode;
};

export function CertificateCard({ data, href, onOpen, showHolder = true, selection, footer }: CertificateCardProps) {
  const title = data.certificateName || data.certificateCode || "Chứng nhận";
  const holder = [data.leaderHolyName, data.leaderFullName].filter(Boolean).join(" ").trim();
  const issued = data.issueDate ? formatVietnamDate(data.issueDate) : null;
  const hasScore = data.totalScore !== null && data.totalScore !== undefined && data.totalScore !== "";
  const openClass = "after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-t-4 border-border bg-white shadow-sm transition-[box-shadow,border-color] hover:border-slate-300 hover:shadow-md focus-within:shadow-md",
        accentClass(data.approvalStatus),
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Certificate aria-hidden size={22} weight="fill" />
          </span>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
            <ResourceCell column="approvalStatus" row={data as Record<string, unknown>} value={data.approvalStatus} />
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-6 text-foreground">
            {href ? (
              <Link className={openClass} href={href as Route}>
                {title}
              </Link>
            ) : (
              <button className={cn("text-left", openClass)} onClick={onOpen} type="button">
                {title}
              </button>
            )}
          </h3>
          {data.certificateCode && data.certificateName ? <p className="mt-0.5 truncate text-xs tabular-nums text-muted">Mã: {data.certificateCode}</p> : null}
        </div>

        <ul className="space-y-2 text-[13px] leading-5 text-text-secondary">
          {showHolder && holder ? (
            <li className="flex items-start gap-2">
              <User aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
              <span className="min-w-0 font-medium text-foreground">{holder}</span>
            </li>
          ) : null}
          {data.courseName || data.courseCode ? (
            <li className="flex items-start gap-2">
              <GraduationCap aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
              <span className="min-w-0">{data.courseName || data.courseCode}</span>
            </li>
          ) : null}
          {issued ? (
            <li className="flex items-start gap-2">
              <CalendarBlank aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
              <span>Ngày cấp: {issued}</span>
            </li>
          ) : null}
          {data.signedBy ? (
            <li className="flex items-start gap-2">
              <PenNib aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
              <span className="min-w-0">Người ký: {data.signedBy}</span>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          {hasScore ? (
            <p className="text-xs text-text-secondary">
              Điểm tổng kết{" "}
              <span className={cn("text-sm font-semibold tabular-nums", data.passed === false ? "text-danger" : "text-foreground")}>{scoreText(data.totalScore)}</span>
            </p>
          ) : (
            <p className="text-xs text-muted">Chưa có điểm</p>
          )}
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          {selection ? (
            <input
              aria-label="Chọn chứng nhận"
              checked={selection.checked}
              className="h-4 w-4 cursor-pointer accent-primary"
              onChange={selection.onToggle}
              type="checkbox"
            />
          ) : null}
          {footer}
        </div>
      </div>
    </article>
  );
}
