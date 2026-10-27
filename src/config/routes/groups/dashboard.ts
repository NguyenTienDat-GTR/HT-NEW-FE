import { Bell, ChartLineUp, Key, SquaresFour } from "@phosphor-icons/react";
import { route, type RouteGroup } from "../route-config";

export const dashboardRouteGroup: RouteGroup = {
    moduleName: "dashboard",
    label: "Tổng quan",
    icon: SquaresFour,
    children: [
      {
        path: "/dashboard",
        moduleName: "dashboard",
        title: "Tổng quan",
        subtitle: "KPI vận hành theo scope hiện tại.",
        permissionPrefixes: ["analytics.dashboard.read.", "organization."],
        kind: "dashboard",
        icon: SquaresFour,
        columns: [],
      },
      {
        path: "/analytics",
        moduleName: "dashboard.analytics",
        title: "Phân tích",
        subtitle: "Breakdown, trend và comparison từ response analytics.",
        permissionPrefixes: ["analytics.dashboard.read."],
        kind: "analytics",
        icon: ChartLineUp,
        columns: [],
      },
      route({
        path: "/notifications",
        moduleName: "system.notification",
        title: "Thông báo",
        subtitle: "Inbox workflow và realtime notification theo user hiện tại.",
        endpoint: "/system/notifications",
        idField: "id",
        kind: "notifications",
        icon: Bell,
        columns: ["title", "eventType", "courseCode", "readAt", "createdAt", "status"],
        permissionPrefixes: [],
        filterLabels: ["Tất cả", "Chưa đọc", "Đã đọc"],
      }),
      route({
        path: "/my-permissions",
        moduleName: "system.my-permission",
        title: "Quyền của tôi",
        subtitle: "Danh sách quyền đang có hiệu lực của tài khoản và vai trò hiện tại.",
        kind: "my-permissions",
        icon: Key,
        columns: [],
        permissionPrefixes: [],
      }),
    ],
  };
