import { describe, expect, it } from "vitest";
import { deaneryOptions, filterCandidates, idsToCopy, parishOptions } from "@/modules/prerequisite-copy/candidate-filter";
import { emptyFilters, type CopyCandidate } from "@/modules/prerequisite-copy/types";

function candidate(patch: Partial<CopyCandidate>): CopyCandidate {
  return {
    leaderId: "l1",
    holyName: "Giuse",
    fullName: "Nguyễn Văn An",
    gender: "NAM",
    leaderLevel: null,
    deaneryId: "d1",
    deaneryName: "Phú Cường",
    parishId: "p1",
    parishName: "Chánh Tòa",
    sourceCourseCode: "c1",
    sourceCourseName: "Khóa 1",
    finalResult: "PASSED",
    eligible: true,
    blockedReason: null,
    ...patch,
  };
}

const list = [
  candidate({ leaderId: "a" }),
  candidate({ leaderId: "b", finalResult: "FAILED", parishId: "p2", parishName: "Búng" }),
  candidate({ leaderId: "c", deaneryId: "d2", deaneryName: "Thủ Dầu Một", parishId: "p3", parishName: "Lái Thiêu", fullName: "Trần Thị Đào" }),
  candidate({ leaderId: "d", blockedReason: "Đã có hồ sơ trong khóa" }),
];

describe("filterCandidates", () => {
  it("lọc theo giáo hạt, giáo xứ và kết quả", () => {
    expect(filterCandidates(list, { ...emptyFilters, deaneryId: "d1" }, true).map((item) => item.leaderId)).toEqual(["a", "b", "d"]);
    expect(filterCandidates(list, { ...emptyFilters, parishId: "p2" }, true).map((item) => item.leaderId)).toEqual(["b"]);
    expect(filterCandidates(list, { ...emptyFilters, result: "FAILED" }, true).map((item) => item.leaderId)).toEqual(["b"]);
  });

  it("bỏ qua bộ lọc kết quả khi chỉ lấy hồ sơ đạt", () => {
    expect(filterCandidates(list, { ...emptyFilters, result: "FAILED" }, false)).toHaveLength(4);
  });

  it("tìm không phân biệt dấu", () => {
    expect(filterCandidates(list, { ...emptyFilters, search: "dao" }, true).map((item) => item.leaderId)).toEqual(["c"]);
  });
});

describe("options", () => {
  it("giáo xứ phụ thuộc giáo hạt", () => {
    expect(deaneryOptions(list).map((item) => item.value)).toEqual(["d1", "d2"]);
    expect(parishOptions(list, "d2").map((item) => item.value)).toEqual(["p3"]);
  });
});

describe("idsToCopy", () => {
  it("bỏ hồ sơ bị chặn và hồ sơ bị bỏ chọn", () => {
    expect(idsToCopy(list, new Set(["b"]))).toEqual(["a", "c"]);
  });
});
