import { describe, expect, it } from "vitest";
import { getFormSpec } from "@/components/form/resource-form/registry";
import { findRoute } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";

const deaneryAdmin: AuthUser = { username: "admin", roles: ["ADMIN_DEANERY"], permissions: ["training.course.update.deanery", "training.course.create.deanery"] };

describe("form spec registry", () => {
  it("khóa huấn luyện thường dùng form khóa thường, không bị thay bằng form khóa quá khứ", () => {
    const route = findRoute("/training/courses")!;
    for (const action of ["create", "edit"] as const) {
      const spec = getFormSpec(route, action, deaneryAdmin);
      expect(spec?.moduleName, action).toBeUndefined();
      const names = spec?.fields.map((field) => field.name) ?? [];
      expect(names, action).toContain("courseTypeCode");
      expect(names, action).toContain("attendanceEnabled");
      expect(names, action).toContain("autoSendInvitation");
    }
  });

  it("khóa quá khứ vẫn dùng form riêng của nó", () => {
    const pastRoute = getPastRoute();
    for (const action of ["create", "edit"] as const) {
      const spec = getFormSpec(pastRoute, action, deaneryAdmin);
      expect(spec?.moduleName, action).toBe("training.course.past");
      expect(spec?.fields.map((field) => field.name)).not.toContain("attendanceEnabled");
    }
  });

  it("các loại tài nguyên khác vẫn tìm đúng form theo loại", () => {
    expect(getFormSpec(findRoute("/training/course-types")!, "create", deaneryAdmin)?.kind).toBe("course-types");
    expect(getFormSpec(findRoute("/training/score-components")!, "edit", deaneryAdmin)?.kind).toBe("score-components");
    expect(getFormSpec(findRoute("/training/registrations")!, "create", deaneryAdmin)?.moduleName).toBe("training.registration");
  });
});

function getPastRoute() {
  // Route khóa quá khứ dùng chung đường dẫn danh sách nên tìm theo moduleName.
  const route = findRoute("/training/courses")!;
  return { ...route, moduleName: "training.course.past" };
}
