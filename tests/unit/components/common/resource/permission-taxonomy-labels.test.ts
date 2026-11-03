import { describe, expect, it } from "vitest";
import {
  formatPermissionTaxonomyValue,
  permissionTaxonomyKindFromColumn,
  permissionTaxonomyKindFromFilter,
} from "@/components/common/resource/permission-taxonomy-labels";

describe("permission taxonomy labels", () => {
  it("maps permission taxonomy columns to Vietnamese labels without changing unknown values", () => {
    expect(formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn("moduleCode"), "system")).toBe("Hệ thống");
    expect(formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn("resourceCode"), "role_permission")).toBe("Phân quyền vai trò");
    expect(formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn("actionCode"), "assign")).toBe("Gán");
    expect(formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn("scopeCode"), "diocese")).toBe("Giáo phận");
    expect(formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn("permissionCode"), "system.permission.read.all")).toBeUndefined();
    expect(formatPermissionTaxonomyValue("module", "future_module")).toBe("future_module");
  });

  it("detects taxonomy kind from permission filter config", () => {
    expect(permissionTaxonomyKindFromFilter("module.moduleCode", "modules")).toBe("module");
    expect(permissionTaxonomyKindFromFilter("resource.resourceCode", "resources")).toBe("resource");
    expect(permissionTaxonomyKindFromFilter("action.actionCode", "actions")).toBe("action");
    expect(permissionTaxonomyKindFromFilter("scope.scopeCode", "scopes")).toBe("scope");
  });

  it("labels every taxonomy code seeded by the backend in Vietnamese", () => {
    const seeded = {
      module: ["analytics", "auth", "organization", "system", "training"],
      resource: ["account", "account_permission", "account_role", "attendance", "audit_log", "badge_config", "certificate", "certificate_config", "course", "course_type", "dashboard", "deanery", "diocese", "executive_board_assignment", "leader", "leader_certificate", "leader_level", "parish", "participation", "permission", "position", "requirement", "role", "role_permission", "score_formula", "session"],
      action: ["approve", "assign", "create", "create_past", "cross_approve", "delete", "finish", "lock", "manage", "manage_site_subdomain", "read", "reissue", "reset_password", "revoke", "scan", "score", "submit", "toggle", "transfer", "update"],
      scope: ["all", "deanery", "diocese", "parish"],
    } as const;
    for (const [kind, codes] of Object.entries(seeded)) {
      for (const code of codes) {
        expect(formatPermissionTaxonomyValue(kind as "module", code), `${kind}:${code}`).not.toBe(code);
      }
    }
  });
});
