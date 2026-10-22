import { describe, expect, it } from "vitest";
import { auditOperationLabel, auditOperationTone, auditStatusText, auditStatusTone, auditTargetText } from "@/components/common/resource/audit-log-labels";

describe("audit log labels", () => {
  it("shows the target name, falls back to the code, and is null for list operations", () => {
    expect(auditTargetText({ resourceName: "Giuse Nguyễn Văn A", resourceId: "x" })).toBe("Giuse Nguyễn Văn A");
    expect(auditTargetText({ resourceName: null, resourceId: "CC-2026-1" })).toBe("Mã CC-2026-1");
    expect(auditTargetText({ resourceName: "  ", resourceId: null })).toBeNull();
  });

  it("translates operations and keeps unknown verbs readable", () => {
    expect(auditOperationLabel("TOGGLE_STATUS")).toBe("Bật/tắt trạng thái");
    expect(auditOperationLabel("LIST")).toBe("Xem danh sách");
    expect(auditOperationLabel("SEND_REMINDER")).toBe("Send reminder");
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
});
