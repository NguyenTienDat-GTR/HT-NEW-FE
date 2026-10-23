import { describe, expect, it } from "vitest";
import { getFormSpec } from "@/components/form/resource-form/registry";
import { matchRoute, routeGroups } from "@/config/routes/routes";

describe("khóa huấn luyện quá khứ", () => {
  it("có đường dẫn tạo và sửa riêng, không nhầm với form khóa thường", () => {
    const create = matchRoute("/training/courses/past/new");
    expect(create?.type).toBe("create");
    expect(create?.route.moduleName).toBe("training.course.past");

    const edit = matchRoute("/training/courses/past/abc-123/edit");
    expect(edit?.type).toBe("edit");
    expect(edit?.params.id).toBe("abc-123");
    expect(edit?.route.moduleName).toBe("training.course.past");

    expect(matchRoute("/training/courses/new")?.route.moduleName).toBe("training.course");
    expect(matchRoute("/training/courses")?.route.moduleName).toBe("training.course");
  });

  it("chỉ tài khoản có quyền create_past mới tạo / sửa được và quyền không trùng nút Tạo khóa thường", () => {
    const route = matchRoute("/training/courses/past/new")?.route;
    expect(route?.actions?.create?.permissionPrefixes).toEqual(["training.course.create_past."]);
    expect(route?.actions?.edit?.permissionPrefixes).toEqual(["training.course.create_past."]);

    const normal = matchRoute("/training/courses")?.route;
    const prefixes = normal?.actions?.create?.permissionPrefixes ?? [];
    expect("training.course.create_past.diocese".startsWith(prefixes[0] ?? "x")).toBe(false);
  });

  it("không hiện trên sidebar", () => {
    const sidebarPaths = routeGroups.flatMap((group) => group.children.map((child) => child.moduleName));
    expect(sidebarPaths).not.toContain("training.course.past");
  });

  it("form chỉ cần tên khóa và năm tổ chức, không có loại khóa hay thời gian đăng ký", () => {
    const route = matchRoute("/training/courses/past/new")!.route;
    for (const action of ["create", "edit"] as const) {
      const spec = getFormSpec(route, action, null);
      expect(spec?.moduleName).toBe("training.course.past");
      const fields = spec!.fields.map((field) => field.name);
      expect(fields).toEqual(expect.arrayContaining(["courseName", "hostYear", "resultingLevel", "startDate", "endDate"]));
      expect(fields).not.toContain("courseTypeCode");
      expect(fields).not.toContain("registrationStartAt");
      expect(fields).not.toContain("registrationEndAt");
      expect(spec!.fields.filter((field) => field.required).map((field) => field.name)).toEqual(["courseName", "hostYear"]);
    }
  });

  it("gửi tạo mới tới /training/courses/past và sửa tới /training/courses/past/{mã}", () => {
    const route = matchRoute("/training/courses/past/new")!.route;
    const spec = getFormSpec(route, "create", null)!;
    expect(spec.buildEndpoint?.({}, undefined)).toBe("/training/courses/past");
    expect(spec.buildEndpoint?.({}, "a b")).toBe("/training/courses/past/a%20b");
  });
});
