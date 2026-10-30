import { describe, expect, it } from "vitest";
import { resolveResourceModule, resolveWorkspaceView } from "@/modules/workspace/view-resolution";

describe("resolveWorkspaceView", () => {
  it("uses dedicated detail pages only for leaders and courses", () => {
    expect(resolveWorkspaceView("detail", { kind: "leaders" })).toBe("leader-detail");
    expect(resolveWorkspaceView("detail", { kind: "courses" })).toBe("course-detail");
    expect(resolveWorkspaceView("detail", { kind: "dioceses" })).toBe("resource");
  });

  it("maps form paths to form modes before looking at the resource kind", () => {
    expect(resolveWorkspaceView("create", { kind: "certificate-config" })).toBe("form-create");
    expect(resolveWorkspaceView("edit", { kind: "leaders" })).toBe("form-edit");
    expect(resolveWorkspaceView("revoke", { kind: "certificates" })).toBe("form-revoke");
    expect(resolveWorkspaceView("score", { kind: "participations" })).toBe("form-score");
  });

  it("routes standalone kinds to their own screens and everything else to the resource list", () => {
    expect(resolveWorkspaceView("list", { kind: "dashboard" })).toBe("dashboard");
    expect(resolveWorkspaceView("list", { kind: "analytics" })).toBe("analytics");
    expect(resolveWorkspaceView("list", { kind: "badge-config" })).toBe("badge-config");
    expect(resolveWorkspaceView("list", { kind: "my-permissions" })).toBe("my-permissions");
    expect(resolveWorkspaceView("list", { kind: "parishes" })).toBe("resource");
    expect(resolveWorkspaceView("matrix", { kind: "courses" })).toBe("resource");
  });
});

describe("resolveResourceModule", () => {
  it("picks the first matching prefix rule, workflow before generic training", () => {
    expect(resolveResourceModule("leader.profiles")).toBe("leader");
    expect(resolveResourceModule("organization.dioceses")).toBe("organization");
    expect(resolveResourceModule("executive-board.positions")).toBe("executive-board");
    expect(resolveResourceModule("training-workflow.approvals")).toBe("training-workflow");
    expect(resolveResourceModule("training.registrations")).toBe("training-workflow");
    expect(resolveResourceModule("training.score")).toBe("training-workflow");
    expect(resolveResourceModule("training.courses")).toBe("training");
    expect(resolveResourceModule("certificate.list")).toBe("certificate");
  });

  it("falls back to system for any other module", () => {
    expect(resolveResourceModule("system.roles")).toBe("system");
    expect(resolveResourceModule("")).toBe("system");
  });
});
