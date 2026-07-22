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
    expect(formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn("scopeCode"), "diocese")).toBe("Giáo phận hiện tại");
    expect(formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn("permissionCode"), "system.permission.read.all")).toBeUndefined();
    expect(formatPermissionTaxonomyValue("module", "future_module")).toBe("future_module");
  });

  it("detects taxonomy kind from permission filter config", () => {
    expect(permissionTaxonomyKindFromFilter("module.moduleCode", "modules")).toBe("module");
    expect(permissionTaxonomyKindFromFilter("resource.resourceCode", "resources")).toBe("resource");
    expect(permissionTaxonomyKindFromFilter("action.actionCode", "actions")).toBe("action");
    expect(permissionTaxonomyKindFromFilter("scope.scopeCode", "scopes")).toBe("scope");
  });
});
