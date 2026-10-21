"use client";

import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { RouteConfig } from "@/config/routes/routes";
import { CourseCardGrid } from "./course-card-grid";

export function TrainingResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Huấn luyện",
        moduleDescription: "Thiết lập điều kiện, khóa, thành phần điểm và công thức theo owner scope.",
        // Chỉ danh sách khóa có chế độ thẻ; các màn khác (loại khóa, thành phần điểm) giữ bảng.
        cardView: route.kind === "courses" ? { render: (props) => <CourseCardGrid {...props} />, defaultMode: "card" } : undefined,
      }}
    />
  );
}
