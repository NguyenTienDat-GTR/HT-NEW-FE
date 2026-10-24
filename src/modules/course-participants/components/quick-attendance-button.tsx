"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { QrCode } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { apiFetch, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch } from "@/lib/api/search";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { Tip } from "@/components/ui/tip";
import { ATTENDANCE_COURSE_FILTERS, attendanceCourses, type AttendanceCourse } from "../open-courses";
import { AttendanceScannerDialog } from "./attendance-scanner-dialog";

// Nút điểm danh nhanh ở header: chọn một khóa đang mở trong phạm vi quản lý rồi quét QR. Chỉ hiện với tài khoản có quyền riêng quét điểm danh (training.attendance.scan.*).
export function QuickAttendanceButton() {
  const user = useAuthStore((state) => state.user);
  const allowed = hasPermissionPrefix(user, "training.attendance.scan.") && !user?.unitLocked;
  const [menuOpen, setMenuOpen] = useState(false);
  const [course, setCourse] = useState<AttendanceCourse | null>(null);

  const query = useQuery({
    queryKey: ["quick-attendance", "courses"],
    enabled: allowed && menuOpen,
    staleTime: 30_000,
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>>>(`/training/courses?${serializeBaseSearch({ page: 0, size: 100, filters: ATTENDANCE_COURSE_FILTERS }).toString()}`),
  });
  const courses = useMemo(() => attendanceCourses(query.data?.content ?? []), [query.data]);

  if (!allowed) return null;

  return (
    <>
      <DropdownMenu.Root onOpenChange={setMenuOpen} open={menuOpen}>
        <Tip label="Quét QR điểm danh nhanh">
          <DropdownMenu.Trigger asChild>
            <button
              aria-label="Quét QR điểm danh nhanh"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              type="button"
            >
              <QrCode size={22} />
            </button>
          </DropdownMenu.Trigger>
        </Tip>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" className="z-50 max-h-[60vh] w-[min(340px,calc(100vw-32px))] overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-[var(--shadow-elevated)] focus:outline-none" sideOffset={8}>
            <DropdownMenu.Label className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Chọn khóa để điểm danh</DropdownMenu.Label>
            {query.isLoading ? <p className="px-3 py-3 text-sm text-muted">Đang tải danh sách khóa…</p> : null}
            {query.isError ? <p className="px-3 py-3 text-sm text-danger" role="alert">{getApiErrorMessage(query.error)}</p> : null}
            {query.isSuccess && courses.length === 0 ? <p className="px-3 py-3 text-sm text-muted">Không có khóa huấn luyện nào đang mở và bật điểm danh trong phạm vi của bạn.</p> : null}
            {courses.map((item) => (
              <DropdownMenu.Item
                className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-foreground outline-none data-[highlighted]:bg-surface-hover"
                key={item.courseCode}
                onSelect={() => setCourse(item)}
              >
                {item.courseName}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {course ? <AttendanceScannerDialog courseCode={course.courseCode} courseName={course.courseName} onOpenChange={(open) => (open ? undefined : setCourse(null))} open /> : null}
    </>
  );
}
