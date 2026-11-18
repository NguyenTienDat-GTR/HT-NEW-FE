import { describe, expect, it } from "vitest";
import { auditMessageText, auditMethodText, auditOperationLabel, auditOperationTone, auditStatusText, auditStatusTone, auditTargetText } from "@/components/common/resource/audit-log-labels";

describe("audit log labels", () => {
  it("shows the target name, falls back to the code, and is null for list operations", () => {
    expect(auditTargetText({ resourceName: "Giuse Nguyễn Văn A", resourceId: "x" })).toBe("Giuse Nguyễn Văn A");
    expect(auditTargetText({ resourceName: null, resourceId: "CC-2026-1" })).toBe("Mã CC-2026-1");
    expect(auditTargetText({ resourceName: "  ", resourceId: null })).toBeNull();
  });

  it("translates operations and never leaves English for unknown verbs", () => {
    expect(auditOperationLabel("TOGGLE_STATUS")).toBe("Bật/tắt trạng thái");
    expect(auditOperationLabel("LIST")).toBe("Xem danh sách");
    expect(auditOperationLabel("RESET_PASSWORD")).toBe("Đặt lại mật khẩu");
    expect(auditOperationLabel("SEND_REMINDER")).toBe("Thao tác khác");
    expect(auditOperationTone("DELETE")).toBe("danger");
    expect(auditOperationTone("VIEW")).toBe("neutral");
  });

  it("explains HTTP results in Vietnamese with a matching tone", () => {
    expect(auditStatusText(403)).toBe("Không đủ quyền");
    expect(auditStatusText(418)).toBe("Yêu cầu bị từ chối");
    expect(auditStatusTone(200)).toBe("success");
    expect(auditStatusTone(404)).toBe("warning");
    expect(auditStatusTone(500)).toBe("danger");
  });

  it("builds the Vietnamese content line instead of the raw request line", () => {
    expect(auditMessageText({ operation: "UPDATE", resource: "parish", resourceName: "Giáo xứ A", message: "PUT /api/parishes/1" })).toBe("Cập nhật Giáo xứ: Giáo xứ A");
    expect(auditMessageText({ operation: "LIST", resource: "diocese", message: "GET /api/dioceses" })).toBe("Xem danh sách Giáo phận");
    expect(auditMessageText({ message: "GET /api/x" })).toBe("");
  });

  it("describes the HTTP method in Vietnamese", () => {
    expect(auditMethodText("GET")).toBe("Xem dữ liệu (GET)");
    expect(auditMethodText("patch")).toBe("Cập nhật một phần (PATCH)");
  });
});
