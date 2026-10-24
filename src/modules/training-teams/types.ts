// Tổng quan chia đội của khóa (khớp TeamOverviewResponse của BE). unitType: DEANERY (khóa giáo phận) hoặc PARISH (khóa giáo hạt).
export type TeamSummary = {
  teamName: string;
  total: number;
  male: number;
  female: number;
  other: number;
  units: number;
};

export type TeamOverview = {
  courseCode: string;
  totalParticipants: number;
  male: number;
  female: number;
  other: number;
  dividedParticipants: number;
  unitType: "DEANERY" | "PARISH";
  activeUnitCount: number;
  teams: TeamSummary[];
};

export type TeamNamingMode = "SEQUENTIAL" | "CUSTOM";
export type TeamAssignmentMode = "RANDOM" | "UNIT_LIMIT";

export type TeamDivideBody = {
  teamCount: number;
  teamSize: number;
  namingMode: TeamNamingMode;
  teamNames?: string[];
  assignmentMode: TeamAssignmentMode;
  maxUnitsPerTeam?: number;
};

export function unitLabel(unitType: TeamOverview["unitType"]) {
  return unitType === "PARISH" ? "giáo xứ" : "giáo hạt";
}
