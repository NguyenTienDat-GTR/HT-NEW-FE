import { describe, expect, it } from "vitest";
import type { PageResponse } from "@/lib/api/client";
import { buildPermissionTaxonomyFallback, filterRowsFromResponse } from "@/components/common/resource/resource-toolbar";

describe("resource toolbar permission taxonomy options", () => {
  it("reads option rows from a taxonomy object collection", () => {
    const rows = filterRowsFromResponse(
      {
        modules: [
          { code: "system", name: "Hệ thống" },
          { code: "training", name: "Huấn luyện" },
        ],
      },
      "modules",
    );

    expect(rows).toEqual([
      { code: "system", name: "Hệ thống" },
      { code: "training", name: "Huấn luyện" },
    ]);
  });

  it("builds dropdown options from readable permissions when taxonomy is unavailable", () => {
    const page: PageResponse<Record<string, unknown>> = {
      content: [
        { permissionCode: "system.role.read.all", moduleCode: "system", resourceCode: "role", actionCode: "read", scopeCode: "all" },
        { permissionCode: "system.permission.read.all", moduleCode: "system", resourceCode: "permission", actionCode: "read", scopeCode: "all" },
        { permissionCode: "training.course.read.diocese", moduleCode: "training", resourceCode: "course", actionCode: "read", scopeCode: "diocese" },
      ],
      totalElements: 3,
      totalPages: 1,
      size: 100,
      number: 0,
      first: true,
      last: true,
    };

    expect(buildPermissionTaxonomyFallback(page, "modules")).toEqual([
      { code: "system", name: "system" },
      { code: "training", name: "training" },
    ]);
    expect(buildPermissionTaxonomyFallback(page, "resources")).toEqual([
      { code: "course", name: "course" },
      { code: "permission", name: "permission" },
      { code: "role", name: "role" },
    ]);
    expect(buildPermissionTaxonomyFallback(page, "actions")).toEqual([{ code: "read", name: "read" }]);
    expect(buildPermissionTaxonomyFallback(page, "scopes")).toEqual([
      { code: "all", name: "all" },
      { code: "diocese", name: "diocese" },
    ]);
  });
});
