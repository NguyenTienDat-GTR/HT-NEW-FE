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

  it("treats permission revocation like a grant: same group, opens the permission list modal and the current permissions page", () => {
    for (const eventType of ["ROLE_PERMISSION_REVOKED", "ACCOUNT_PERMISSION_REVOKED", "ROLE_PERMISSION_EXPIRED", "ACCOUNT_PERMISSION_EXPIRED"]) {
      const item = {
        id: eventType,
        eventType,
        payload: JSON.stringify({
          kind: "PERMISSION_REVOKE",
          targetType: "ACCOUNT",
          targetName: "an",
          heading: "Quyền vừa bị thu hồi",
          items: [{ label: "Xem hồ sơ", detail: "Huynh trưởng · Xem · Giáo phận", code: "organization.leader.read.diocese" }],
        }),
      };
      expect(notificationGroupOf(item)).toBe("access");
      expect(notificationHref(item)).toBe(MY_PERMISSIONS_PATH);
      expect(notificationDetail(item)?.kind).toBe("PERMISSION_REVOKE");
      expect(notificationDetail(item)?.items[0]?.label).toBe("Xem hồ sơ");
    }
  });
});
