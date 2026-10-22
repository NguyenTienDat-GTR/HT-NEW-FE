"use client";

import { ArrowRight, CalendarBlank, Clock, MapPin, UsersThree, WarningCircle } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { cn, viNumber } from "@/lib/utils";
import { SkeletonBlock } from "@/modules/analytics/components/section-card";
import { formatDateVi } from "@/modules/analytics/record-format";
import type { OpenCourse } from "@/modules/analytics/types";

/** Trang chi tiết khóa, mở sẵn tab đăng ký tham dự. */
export function courseRegistrationHref(courseCode: string) {
  return `/training/courses/${encodeURIComponent(courseCode)}?tab=registrations`;
}

export function deadlineText(hoursLeft?: number | null) {
  if (hoursLeft === null || hoursLeft === undefined) return "Không giới hạn hạn đăng ký";
  if (hoursLeft < 1) return "Còn dưới 1 giờ";
  if (hoursLeft < 24) return `Còn ${hoursLeft} giờ`;
  return `Còn ${Math.floor(hoursLeft / 24)} ngày`;
}

/** Khóa đang mở đăng ký: khóa sắp hết hạn nổi màu cảnh báo (kèm biểu tượng và chữ, không chỉ màu); bấm vào để sang khóa đó và đăng ký. */
export function OpenCourses({ courses, loading }: { courses?: OpenCourse[]; loading?: boolean }) {
  if (loading || !courses) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <SkeletonBlock className="h-[132px]" key={index} />
        ))}
      </div>
    );
  }
  if (!courses.length) {
    return (
      <div className="grid min-h-[132px] place-items-center rounded-lg border border-dashed border-border bg-surface-1 p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">Hiện chưa có khóa nào đang mở đăng ký</p>
          <p className="mt-1 text-[13px] text-muted">Khóa mới mở đăng ký sẽ xuất hiện ở đây.</p>
        </div>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {courses.map((course, index) => {
        const closing = course.urgency === "closing";
        return (
          <li key={course.courseCode}>
            <Link
              className={cn(
                "analytics-rise group relative block h-full overflow-hidden rounded-xl border bg-white p-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                closing ? "border-[var(--viz-warning)]/70" : "border-border hover:border-primary/30",
              )}
              href={courseRegistrationHref(course.courseCode) as Route}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", closing ? "bg-[var(--viz-warning)]" : "bg-[var(--viz-3)]")} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{course.courseName}</p>
                  {course.courseType ? <p className="mt-0.5 truncate text-xs text-muted">{course.courseType}</p> : null}
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
                    closing ? "bg-[#fff4d6] text-[#8a5a00]" : "bg-[#e8f5e8] text-[var(--viz-delta-good)]",
                  )}
                >
                  {closing ? <WarningCircle className="h-3.5 w-3.5" weight="fill" /> : <Clock className="h-3.5 w-3.5" weight="bold" />}
                  {closing ? "Gần hết hạn" : "Đang mở"} · {deadlineText(course.hoursLeft)}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <CalendarBlank className="h-3.5 w-3.5 shrink-0 text-muted" weight="bold" />
                  <dt className="sr-only">Thời gian học</dt>
                  <dd>
                    {course.startDate ? formatDateVi(course.startDate) : "—"} – {course.endDate ? formatDateVi(course.endDate) : "—"}
                  </dd>
                </div>
                {course.location ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" weight="bold" />
                    <dt className="sr-only">Địa điểm</dt>
                    <dd className="truncate">{course.location}</dd>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <UsersThree className="h-3.5 w-3.5 shrink-0 text-muted" weight="bold" />
                  <dt className="sr-only">Đã đăng ký</dt>
                  <dd>{viNumber.format(course.registeredLeaders)} huynh trưởng đã đăng ký</dd>
                </div>
              </dl>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                Đăng ký tham dự
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" weight="bold" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
