import { describe, expect, it } from "vitest";
import { buildItems, missingReasons } from "@/modules/cross-deanery/send-form";
import type { Candidate } from "@/modules/cross-deanery/types";

function candidate(patch: Partial<Candidate>): Candidate {
  return {
    leaderId: "l1",
    holyName: "Giuse",
    fullName: "Nguyễn Văn An",
    leaderLevel: null,
    parishId: "p1",
    parishName: "Giáo xứ C",
    deaneryId: "d1",
    deaneryName: "Giáo hạt B",
    eligible: true,
    blockedReason: null,
    ...patch,
  };
}

describe("missingReasons", () => {
  it("mỗi hồ sơ phải có lí do gửi", () => {
    const list = [candidate({ leaderId: "a" }), candidate({ leaderId: "b" })];
    const missing = missingReasons(list, { a: { reason: "Thiếu người", exceptionReason: "", note: "" }, b: { reason: "  ", exceptionReason: "", note: "" } });
    expect(missing.map((item) => item.leaderId)).toEqual(["b"]);
  });

  it("hồ sơ chưa đủ điều kiện cần thêm lí do ngoại lệ", () => {
    const list = [candidate({ leaderId: "a", eligible: false })];
    expect(missingReasons(list, { a: { reason: "Thiếu người", exceptionReason: "", note: "" } })).toHaveLength(1);
    expect(missingReasons(list, { a: { reason: "Thiếu người", exceptionReason: "Đủ tuổi", note: "" } })).toHaveLength(0);
  });
});

describe("buildItems", () => {
  it("cắt khoảng trắng, bỏ ghi chú trống và chỉ gửi lí do ngoại lệ cho hồ sơ chưa đủ điều kiện", () => {
    const items = buildItems(
      [candidate({ leaderId: "a" }), candidate({ leaderId: "b", eligible: false })],
      {
        a: { reason: " Lí do ", exceptionReason: "bỏ qua", note: "" },
        b: { reason: "Lí do 2", exceptionReason: " Ngoại lệ ", note: " Ghi chú " },
      },
    );
    expect(items).toEqual([
      { leaderId: "a", reason: "Lí do", exceptionReason: undefined, note: undefined },
      { leaderId: "b", reason: "Lí do 2", exceptionReason: "Ngoại lệ", note: "Ghi chú" },
    ]);
  });
});
