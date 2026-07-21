import { ChartLineUp, SquaresFour } from "@phosphor-icons/react";
import type { RouteGroup } from "../route-config";

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
    ],
  };
