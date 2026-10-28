import { describe, expect, it } from "vitest";
import { canChangeParentParish } from "@/modules/organizations/components/parent-parish-card";

describe("đổi giáo xứ cha của giáo họ / giáo điểm", () => {
  it("chỉ admin giáo hạt / giáo phận có quyền tạo giáo xứ mới đổi được", () => {
    expect(canChangeParentParish(["ADMIN_DIOCESE"], true)).toBe(true);
    expect(canChangeParentParish(["ADMIN_DEANERY"], true)).toBe(true);
    expect(canChangeParentParish(["ADMIN_PARISH"], false)).toBe(false);
    expect(canChangeParentParish(["SUPER_ADMIN"], true)).toBe(false);
    expect(canChangeParentParish(undefined, false)).toBe(false);
  });
});
