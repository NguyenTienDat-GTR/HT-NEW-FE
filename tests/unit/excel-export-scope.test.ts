import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/auth-store";
import { exportLevelOf, templateGroupOptions } from "@/components/common/resource/excel-export-scope";

const user = (permissions: string[], roles: string[] = []) => ({ username: "u", roles, permissions }) as unknown as AuthUser;

describe("exportLevelOf", () => {
  it("lấy cấp cao nhất theo hậu tố quyền hồ sơ tham dự", () => {
    expect(exportLevelOf(user(["training.participation.read.parish", "training.participation.submit.parish"]))).toBe("PARISH");
    expect(exportLevelOf(user(["training.participation.read.deanery", "training.participation.read.parish"]))).toBe("DEANERY");
    expect(exportLevelOf(user(["training.participation.read.parish", "training.participation.approve.diocese", "training.participation.read.deanery"]))).toBe("DIOCESE");
  });

  it("coi super admin là cấp giáo phận và người chưa đăng nhập là cấp thấp nhất", () => {
    expect(exportLevelOf(user([], ["SUPER_ADMIN"]))).toBe("DIOCESE");
    expect(exportLevelOf(null)).toBe("PARISH");
  });

  it("bỏ qua quyền ngoài hồ sơ tham dự", () => {
    expect(exportLevelOf(user(["training.course.read.diocese", "training.participation.read.parish"]))).toBe("PARISH");
  });
});

describe("templateGroupOptions", () => {
  it("giáo xứ không có tùy chọn, giáo hạt không gom theo giáo hạt, giáo phận có đủ", () => {
    expect(templateGroupOptions("PARISH")).toEqual([]);
    expect(templateGroupOptions("DEANERY")).toEqual(["NONE", "PARISH"]);
    expect(templateGroupOptions("DIOCESE")).toEqual(["NONE", "DEANERY", "PARISH"]);
  });
});
