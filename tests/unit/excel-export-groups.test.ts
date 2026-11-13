import { describe, expect, it } from "vitest";
import { groupExportColumns } from "@/components/common/resource/excel-export-groups";

describe("groupExportColumns", () => {
  it("chia cột vào nhóm, giữ thứ tự file và bỏ nhóm rỗng", () => {
    const groups = groupExportColumns("/training/participants", ["Tên thánh", "Họ và tên", "Giáo hạt", "Tổng điểm", "Điểm thành phần"]);
    expect(groups?.map((group) => group.title)).toEqual(["Huynh trưởng", "Đơn vị", "Điểm và kết quả"]);
    expect(groups?.[2].columns).toEqual(["Tổng điểm", "Điểm thành phần"]);
  });

  it("đưa cột chưa khai báo vào nhóm Khác", () => {
    const groups = groupExportColumns("/certificates", ["Mã chứng nhận", "Cột mới của backend"]);
    expect(groups?.at(-1)).toEqual({ title: "Khác", columns: ["Cột mới của backend"] });
  });

  it("không chia nhóm khi endpoint chưa khai báo", () => {
    expect(groupExportColumns("/dioceses", ["Tên giáo phận"])).toBeNull();
  });
});
