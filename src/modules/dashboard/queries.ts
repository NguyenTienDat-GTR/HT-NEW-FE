// Khóa và đường dẫn API của tổng quan: dùng chung cho client (useQuery) và server (prefetch khi render HTML).
export const dashboardQueries = {
  overview: { key: ["analytics", "overview"], path: "/analytics/overview" },
  workQueue: { key: ["analytics", "work-queue"], path: "/analytics/work-queue" },
  notifications: { key: ["system", "notifications", "dashboard"], path: "/system/notifications?page=0&size=4" },
} as const;
