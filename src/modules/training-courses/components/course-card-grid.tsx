"use client";

import { CalendarBlank, Clock, MapPin, UsersThree } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/common/resource/resource-format";
import { fillRoute, getResourceId } from "@/components/common/resource/resource-actions";
import { RowActions } from "@/components/common/resource/resource-table";
import type { RouteConfig } from "@/config/routes/routes";
import { formatVietnamDate, formatVietnamDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { organizingStateLabels, organizingStateTones, registrationStateLabels, registrationStateTones, resolveOrganizingState, resolveRegistrationState } from "../registration-state";

type CardProps = { rows: Record<string, unknown>[]; route: RouteConfig; isLoading: boolean };

// Viền trên theo tình trạng tổ chức: đang diễn ra (xanh lá), sắp diễn ra (xanh Marian), đã kết thúc (xám).
const accentByOrganizing = {
  ONGOING: "border-t-success",
  UPCOMING: "border-t-primary",
  ENDED: "border-t-slate-300",
} as const;

export function CourseCardGrid({ rows, route, isLoading }: CardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="h-[220px] rounded-xl border border-border bg-slate-50 motion-safe:animate-pulse" key={index} />
        ))}
      </div>
    );
  }
  return (
    <ul className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => (
        <li key={getResourceId(route, row) ?? index}>
          <CourseCard route={route} row={row} />
        </li>
      ))}
    </ul>
  );
}

function CourseCard({ route, row }: { route: RouteConfig; row: Record<string, unknown> }) {
  const id = getResourceId(route, row);
  const href = id ? fillRoute(route.detailPath, { id }) : undefined;
  const registration = resolveRegistrationState(row);
  const organizing = resolveOrganizingState(row);
  const disabled = row.status === false;
  const name = typeof row.courseName === "string" && row.courseName ? row.courseName : "Khóa huấn luyện";
  const typeName = typeof row.courseTypeName === "string" ? row.courseTypeName : "";
  const location = typeof row.location === "string" ? row.location : "";
  const startDate = typeof row.startDate === "string" ? formatVietnamDate(row.startDate) : null;
  const endDate = typeof row.endDate === "string" ? formatVietnamDate(row.endDate) : null;
  const registrationEnd = typeof row.registrationEndAt === "string" ? formatVietnamDateTime(row.registrationEndAt) : null;
  const approved = typeof row.approvedParticipantCount === "number" ? row.approvedParticipantCount : null;
  const hostYear = typeof row.hostYear === "number" || typeof row.hostYear === "string" ? String(row.hostYear) : "";

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-t-4 border-border bg-white shadow-sm transition-[box-shadow,border-color] hover:border-slate-300 hover:shadow-md focus-within:shadow-md",
        accentByOrganizing[organizing],
        disabled && "opacity-75",
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {typeName ? <Badge tone="info">{typeName}</Badge> : null}
          <Badge tone={organizingStateTones[organizing]}>{organizingStateLabels[organizing]}</Badge>
          {disabled ? <Badge tone="danger">Đã vô hiệu hóa</Badge> : null}
        </div>

        <h3 className="text-base font-semibold leading-6 text-foreground">
          {href ? (
            <Link className="after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" href={href as Route}>
              {name}
            </Link>
          ) : (
            name
          )}
        </h3>

        <ul className="space-y-2 text-[13px] leading-5 text-text-secondary">
          {location ? (
            <li className="flex items-start gap-2">
              <MapPin aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
              <span className="min-w-0">{location}</span>
            </li>
          ) : null}
          {startDate || endDate ? (
            <li className="flex items-start gap-2">
              <CalendarBlank aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
              <span>
                {startDate ?? "—"} → {endDate ?? "—"}
                {hostYear ? <span className="text-muted"> · Năm {hostYear}</span> : null}
              </span>
            </li>
          ) : null}
          {registrationEnd ? (
            <li className={cn("flex items-start gap-2", registration === "OPEN" && "font-medium text-warning")}>
              <Clock aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
              <span>Hạn đăng ký: {registrationEnd}</span>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-slate-50 px-5 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Badge tone={registrationStateTones[registration]}>Đăng ký: {registrationStateLabels[registration]}</Badge>
          {approved !== null ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <UsersThree aria-hidden size={14} /> {approved.toLocaleString("vi-VN")} sa mạc sinh
            </span>
          ) : null}
        </div>
        {/* Thao tác (xem, sửa, bật/tắt...) dùng chung logic quyền với chế độ bảng. */}
        <div className="relative z-10 shrink-0">
          <RowActions route={route} row={row} />
        </div>
      </div>
    </article>
  );
}
