// Sao chép danh sách tham dự của khóa tiên quyết đã kết thúc (khớp CourseCopyModels của BE).
export type CopySourceCourse = {
  courseCode: string;
  courseName: string;
  hostYear: number | null;
  startDate: string | null;
  endDate: string | null;
  finishedAt: string | null;
  ownerName: string | null;
  participantCount: number;
  passedCount: number;
};

export type CopySources = {
  prerequisiteTypeName: string | null;
  // Khóa đích còn sao chép được: khóa thường, còn bật, chưa kết thúc.
  available: boolean;
  sources: CopySourceCourse[];
};

export type CopyFinalResult = "PASSED" | "FAILED";

export type CopyCandidate = {
  leaderId: string;
  holyName: string | null;
  fullName: string | null;
  gender: string | null;
  leaderLevel: string | null;
  deaneryId: string | null;
  deaneryName: string | null;
  parishId: string | null;
  parishName: string | null;
  sourceCourseCode: string;
  sourceCourseName: string;
  finalResult: CopyFinalResult;
  // Đủ điều kiện của khóa đích: chỉ để tham khảo, không chặn sao chép.
  eligible: boolean;
  // Khác null: không sao chép được (đã có hồ sơ trong khóa, ngưng hoạt động, giáo xứ bị khóa).
  blockedReason: string | null;
};

export type CopyResult = {
  copied: number;
  skipped: { leaderId: string; fullName: string | null; reason: string }[];
};

export type ResultFilter = "" | CopyFinalResult;

export type CandidateFilters = {
  deaneryId: string;
  parishId: string;
  result: ResultFilter;
  search: string;
};

export const emptyFilters: CandidateFilters = { deaneryId: "", parishId: "", result: "", search: "" };

export const resultLabels: Record<CopyFinalResult, string> = { PASSED: "Đạt", FAILED: "Không đạt" };
