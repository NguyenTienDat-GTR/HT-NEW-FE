import type { NotificationItem } from "./hooks";

export type NotificationGroupKey = "training" | "certificate" | "access" | "unit" | "other";

export const notificationGroups: { key: NotificationGroupKey; label: string }[] = [
  { key: "training", label: "Khóa huấn luyện" },
  { key: "certificate", label: "Chứng chỉ" },
  { key: "access", label: "Tài khoản & quyền" },
  { key: "unit", label: "Đơn vị" },
];

const accessEvents = new Set(["ROLE_TOGGLED", "PERMISSION_TOGGLED", "ACCOUNT_ROLE_TOGGLED", "ROLE_PERMISSION_TOGGLED", "ACCOUNT_PERMISSION_TOGGLED"]);

export function notificationGroupOf(item: NotificationItem): NotificationGroupKey {
  const type = item.eventType ?? "";
  if (type.startsWith("training.certificate.")) return "certificate";
  if (type.startsWith("training.")) return "training";
  if (accessEvents.has(type)) return "access";
  if (type === "UNIT_STATUS_TOGGLED") return "unit";
  return "other";
}

const accessRoutes: Record<string, string> = {
  ROLE_TOGGLED: "/system/roles",
  PERMISSION_TOGGLED: "/system/permissions",
  ACCOUNT_ROLE_TOGGLED: "/system/account-roles",
  ROLE_PERMISSION_TOGGLED: "/system/role-permissions",
  ACCOUNT_PERMISSION_TOGGLED: "/system/account-permissions",
};

const unitRoutes = {
  DIOCESE: "/organization/dioceses",
  DEANERY: "/organization/deaneries",
  PARISH: "/organization/parishes",
} as const;

/** Màn hình tương ứng khi bấm vào một thông báo. */
export function notificationHref(item: NotificationItem): string {
  const type = item.eventType ?? "";
  if (type.startsWith("training.certificate.")) return "/certificates";
  if (type.startsWith("training.")) return item.courseCode ? `/training/courses/${encodeURIComponent(item.courseCode)}` : "/training/courses";
  if (accessRoutes[type]) return accessRoutes[type];
  if (type === "UNIT_STATUS_TOGGLED" && item.senderUnitType) {
    const base = unitRoutes[item.senderUnitType];
    return item.senderUnitId ? `${base}?detail=${encodeURIComponent(item.senderUnitId)}` : base;
  }
  return "/notifications";
}

export function notificationBadgeLabel(unreadCount?: number | null) {
  if (!unreadCount || unreadCount <= 0) return null;
  return unreadCount > 99 ? "99+" : String(unreadCount);
}

export function relativeTime(value?: string | null, now = Date.now()) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(time).toLocaleDateString("vi-VN");
}
