import type { TeamAssignmentMode, TeamDivideBody, TeamNamingMode, TeamOverview } from "./types";
import { unitLabel } from "./types";

export const MAX_TEAMS = 500;

export type TeamFormState = {
  teamCount: string;
  teamSize: string;
  namingMode: TeamNamingMode;
  customNames: string[];
  assignmentMode: TeamAssignmentMode;
  maxUnits: string;
};

export function parsePositiveInt(value: string) {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

// Nhập số đội thì số hồ sơ mỗi đội gợi ý là sĩ số lớn nhất khi chia đều; nhập số hồ sơ mỗi đội thì số đội là số đội tối thiểu để chứa đủ.
export function teamSizeFor(total: number, teamCount: number) {
  return Math.ceil(total / teamCount);
}

export function teamCountFor(total: number, teamSize: number) {
  return Math.ceil(total / teamSize);
}

export function initialFormState(overview: TeamOverview): TeamFormState {
  const teamCount = overview.teams.length > 0 ? overview.teams.length : Math.min(2, Math.max(overview.totalParticipants, 1));
  return {
    teamCount: String(teamCount),
    teamSize: overview.totalParticipants > 0 ? String(teamSizeFor(overview.totalParticipants, teamCount)) : "",
    namingMode: "SEQUENTIAL",
    customNames: [],
    assignmentMode: "RANDOM",
    maxUnits: "",
  };
}

export function sequentialNames(teamCount: number) {
  return Array.from({ length: teamCount }, (_, index) => `Đội ${index + 1}`);
}

// Trả về thông báo lỗi đầu tiên (tiếng Việt) hoặc null khi cấu hình hợp lệ; BE kiểm tra lại toàn bộ.
export function validateForm(form: TeamFormState, overview: TeamOverview): string | null {
  const total = overview.totalParticipants;
  if (total === 0) return "Danh sách tham dự chưa có hồ sơ nào để chia đội";
  const teamCount = parsePositiveInt(form.teamCount);
  if (teamCount === null) return "Nhập số đội cần chia (số nguyên từ 1)";
  if (teamCount > MAX_TEAMS) return `Tối đa ${MAX_TEAMS} đội`;
  if (teamCount > total) return `Số đội không được lớn hơn tổng số hồ sơ (${total})`;
  const teamSize = parsePositiveInt(form.teamSize);
  if (teamSize === null) return "Nhập số hồ sơ mỗi đội (số nguyên từ 1)";
  if (teamCount * teamSize < total) return `Số đội x số hồ sơ mỗi đội (${teamCount * teamSize}) chưa đủ chứa ${total} hồ sơ`;
  if (form.namingMode === "CUSTOM") {
    const names = form.customNames.slice(0, teamCount).map((name) => name.trim().replace(/\s+/g, " "));
    if (names.length < teamCount || names.some((name) => name === "")) return `Nhập đủ tên cho ${teamCount} đội`;
    if (names.some((name) => name.length > 150)) return "Tên đội tối đa 150 ký tự";
    if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) return "Tên đội không được trùng nhau";
  }
  if (form.assignmentMode === "UNIT_LIMIT") {
    const label = unitLabel(overview.unitType);
    const maxUnits = parsePositiveInt(form.maxUnits);
    if (maxUnits === null) return `Nhập số ${label} tối đa trong cùng một đội`;
    if (maxUnits > overview.activeUnitCount) return `Số ${label} tối đa không được lớn hơn số ${label} đang hoạt động (${overview.activeUnitCount})`;
  }
  return null;
}

export function buildBody(form: TeamFormState): TeamDivideBody {
  const teamCount = Number(form.teamCount);
  return {
    teamCount,
    teamSize: Number(form.teamSize),
    namingMode: form.namingMode,
    teamNames: form.namingMode === "CUSTOM" ? form.customNames.slice(0, teamCount).map((name) => name.trim().replace(/\s+/g, " ")) : undefined,
    assignmentMode: form.assignmentMode,
    maxUnitsPerTeam: form.assignmentMode === "UNIT_LIMIT" ? Number(form.maxUnits) : undefined,
  };
}
