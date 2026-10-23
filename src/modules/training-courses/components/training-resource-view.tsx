"use client";

import { ClockCounterClockwise } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/config/routes/routes";
import { CourseCardGrid } from "./course-card-grid";

// Tạo khóa quá khứ: chỉ tài khoản được super-admin cấp quyền training.course.create_past.* mới thấy nút.
function PastCourseButton() {
  const user = useAuthStore((state) => state.user);
  if (!hasPermissionPrefix(user, "training.course.create_past.")) return null;
  return (
    <Tip label="Lưu khóa đã tổ chức trong quá khứ, chỉ cần tên khóa và năm tổ chức">
      <Button asChild variant="outline">
        <Link href={"/training/courses/past/new" as Route}>
          <ClockCounterClockwise size={18} />
          Tạo khóa quá khứ
        </Link>
      </Button>
    </Tip>
  );
}

export function TrainingResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Huấn luyện",
        moduleHref: route.path === "/training/courses" ? undefined : "/training/courses",
        moduleDescription: "Thiết lập điều kiện, khóa, thành phần điểm và công thức theo owner scope.",
        // Chỉ danh sách khóa có chế độ thẻ; các màn khác (loại khóa, thành phần điểm) giữ bảng.
        toolbarActions: route.kind === "courses" ? <PastCourseButton /> : undefined,
        cardView: route.kind === "courses" ? { render: (props) => <CourseCardGrid {...props} />, defaultMode: "card" } : undefined,
      }}
    />
  );
}
