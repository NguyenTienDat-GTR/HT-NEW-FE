import { describe, expect, it } from "vitest";
import { buildBody, initialFormState, teamCountFor, teamSizeFor, validateForm } from "@/modules/training-teams/team-form";
import type { TeamOverview } from "@/modules/training-teams/types";

const overview: TeamOverview = {
  courseCode: "K1",
  totalParticipants: 100,
  male: 60,
  female: 40,
  other: 0,
  dividedParticipants: 0,
  unitType: "DEANERY",
  activeUnitCount: 6,
  teams: [],
};

describe("team-form", () => {
  it("tự tính số hồ sơ mỗi đội và số đội", () => {
    expect(teamSizeFor(100, 7)).toBe(15);
    expect(teamCountFor(100, 30)).toBe(4);
  });

  it("kiểm tra cấu hình hợp lệ và các lỗi thường gặp", () => {
    const form = initialFormState(overview);
    expect(validateForm({ ...form, teamCount: "4", teamSize: "25" }, overview)).toBeNull();
    expect(validateForm({ ...form, teamCount: "4", teamSize: "20" }, overview)).toMatch(/chưa đủ chứa/);
    expect(validateForm({ ...form, teamCount: "0", teamSize: "20" }, overview)).toMatch(/số đội/i);
    expect(validateForm({ ...form, teamCount: "2", teamSize: "50", namingMode: "CUSTOM", customNames: ["A", "a"] }, overview)).toMatch(/trùng/);
    expect(validateForm({ ...form, teamCount: "2", teamSize: "50", assignmentMode: "UNIT_LIMIT", maxUnits: "7" }, overview)).toMatch(/giáo hạt đang hoạt động/);
    expect(validateForm({ ...form, teamCount: "2", teamSize: "50", assignmentMode: "UNIT_LIMIT", maxUnits: "3" }, overview)).toBeNull();
  });

  it("dựng body gửi BE", () => {
    const form = { ...initialFormState(overview), teamCount: "2", teamSize: "50", namingMode: "CUSTOM" as const, customNames: [" A  B ", "C"], assignmentMode: "UNIT_LIMIT" as const, maxUnits: "2" };
    expect(buildBody(form)).toEqual({ teamCount: 2, teamSize: 50, namingMode: "CUSTOM", teamNames: ["A B", "C"], assignmentMode: "UNIT_LIMIT", maxUnitsPerTeam: 2 });
  });
});
