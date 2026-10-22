import { describe, expect, it } from "vitest";
import { MY_PERMISSIONS_PATH, notificationDetail, notificationGroupOf, notificationHref } from "@/modules/notifications/notification-meta";

describe("notification meta", () => {
  it("parses grouped decision payload so the list opens in a modal", () => {
    const detail = notificationDetail({
      id: "1",
      eventType: "training.registration.approved",
      payload: JSON.stringify({ kind: "DECISION_LIST", heading: "Khóa A", items: [{ label: "Huynh trưởng 1", detail: "Giáo xứ B" }] }),
    });
    expect(detail?.items).toHaveLength(1);
    expect(detail?.heading).toBe("Khóa A");
  });

  it("returns null for notifications without a valid payload", () => {
    expect(notificationDetail({ id: "1" })).toBeNull();
    expect(notificationDetail({ id: "2", payload: "không phải json" })).toBeNull();
    expect(notificationDetail({ id: "3", payload: JSON.stringify({ kind: "OTHER", items: [] }) })).toBeNull();
  });

  it("routes permission grant notifications to the current permissions page", () => {
    const item = { id: "4", eventType: "ACCOUNT_PERMISSION_GRANTED" };
    expect(notificationGroupOf(item)).toBe("access");
    expect(notificationHref(item)).toBe(MY_PERMISSIONS_PATH);
    expect(notificationHref({ id: "5", eventType: "ROLE_PERMISSION_GRANTED" })).toBe(MY_PERMISSIONS_PATH);
  });
});
