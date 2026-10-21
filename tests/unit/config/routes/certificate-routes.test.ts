import { describe, expect, it } from "vitest";
import { findRoute } from "@/config/routes/routes";

describe("certificate list route", () => {
  const route = findRoute("/certificates");

  it("không còn tạo, sửa hay đổi trạng thái chứng nhận thủ công", () => {
    expect(route).toBeDefined();
    expect(route?.createPath).toBeUndefined();
    expect(route?.actions?.create).toBeUndefined();
    expect(route?.actions?.edit).toBeUndefined();
    expect(route?.actions?.toggle).toBeUndefined();
    expect(route?.columns).not.toContain("status");
  });

  it("có hành động thu hồi theo quyền training.certificate.revoke.*", () => {
    expect(route?.actions?.revoke?.permissionPrefixes).toEqual(["training.certificate.revoke."]);
  });
});

describe("certificate reissue action", () => {
  it("cấp lại theo quyền training.certificate.reissue.*, tách khỏi thu hồi", () => {
    const route = findRoute("/certificates");
    expect(route?.actions?.reissue?.permissionPrefixes).toEqual(["training.certificate.reissue."]);
    expect(route?.actions?.revoke?.permissionPrefixes).toEqual(["training.certificate.revoke."]);
    expect(route?.actions?.toggle).toBeUndefined();
  });
});

describe("certificate list filters and search", () => {
  const route = findRoute("/certificates");

  it("lọc theo khóa, loại khóa có chứng nhận, trạng thái, giáo hạt, giáo xứ và năm cấp", () => {
    const keys = (route?.filters ?? []).map((filter) => filter.key);
    expect(keys).toEqual([
      "course.courseCode",
      "course.courseType.typeCode",
      "approvalStatus",
      "leader.parish.deanery.id",
      "leader.parish.id",
      "issueDate:year",
    ]);
    const status = route?.filters?.find((filter) => filter.key === "approvalStatus");
    expect(status?.options?.map((option) => option.value)).toContain("REVOKED");
    const year = route?.filters?.find((filter) => filter.key === "issueDate:year");
    // Năm cấp lấy từ DB (các năm có chứng nhận thật), không cố định hay cắt theo số năm gần đây.
    expect(year?.optionsEndpoint).toBe("/certificates/issue-years");
    expect(year?.optionValue).toBe("year");
    expect(year?.options).toBeUndefined();
  });

  it("giáo xứ chỉ hiện các giáo xứ thuộc giáo hạt đang chọn", () => {
    const parish = route?.filters?.find((filter) => filter.key === "leader.parish.id");
    expect(parish?.dependsOn?.filterKey).toBe("leader.parish.deanery.id");
  });

  it("tìm được theo tên huynh trưởng (họ tên, tên họ, tên thánh) ngoài mã chứng nhận và khóa", () => {
    expect(route?.searchFields).toEqual(
      expect.arrayContaining([
        "certificateCode",
        "leader.lastName+leader.firstName",
        "leader.firstName+leader.lastName",
        "leader.holyName+leader.lastName+leader.firstName",
        "course.courseName",
      ]),
    );
  });
});
