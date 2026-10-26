// Kiểu dữ liệu của tab "Thẻ & điểm danh" trong khóa huấn luyện (khớp phản hồi BE).

export type AttendanceSummary = {
  courseCode: string;
  attendanceEnabled: boolean;
  autoSendInvitation: boolean;
  totalParticipants: number;
  checkedIn: number;
  notCheckedIn: number;
  invitationSent: number;
  invitationPending: number;
  invitationFailed: number;
  withoutEmail: number;
};

export type InvitationFilter = "SENT" | "PENDING" | "FAILED" | "NO_EMAIL";

export type ParticipantRow = {
  id: string;
  holyName?: string | null;
  fullName: string;
  parishName?: string | null;
  deaneryName?: string | null;
  teamName?: string | null;
  email?: string | null;
  emailProblem?: string | null;
  invitationSentAt?: string | null;
  invitationError?: string | null;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
};

export type ScanStatus = "CHECKED_IN" | "ALREADY_CHECKED_IN" | "CHECK_IN_CANCELLED" | "READY";

export type ScanResult = {
  status: ScanStatus;
  participationId: string;
  courseCode?: string | null;
  courseName?: string | null;
  holyName?: string | null;
  fullName: string;
  parishName?: string | null;
  deaneryName?: string | null;
  teamName?: string | null;
  checkedInAt?: string | null;
};

export type InvitationIssue = {
  participationId?: string | null;
  holyName?: string | null;
  fullName?: string | null;
  email?: string | null;
  reason: string;
};

export type InvitationResult = {
  total: number;
  sent: number;
  skippedAlreadySent: number;
  failed: number;
  includeQr: boolean;
  issues: InvitationIssue[];
};

export type JobStatus = "PENDING" | "DONE" | "FAILED";

export type InvitationJob = { jobId: string; status: JobStatus; result?: InvitationResult | null; error?: string | null };

export type BadgeJob = {
  jobId: string;
  status: JobStatus;
  filename?: string | null;
  badgeCount?: number | null;
  pageCount?: number | null;
  error?: string | null;
};

export type BadgeExportOptions = {
  configId?: string;
  participationIds?: string[];
  teamName?: string;
  includeBack: boolean;
  flipEdge: "LONG" | "SHORT";
};

export type InvitationOptions = {
  participationIds?: string[];
  includeQr: boolean;
  resend: boolean;
};

// Cấu hình thẻ chọn được khi xuất thẻ cho khóa; applied = cấu hình sẽ dùng khi không chọn cấu hình nào.
export type UsableBadgeConfig = {
  id: string;
  name: string;
  isDefault: boolean;
  applied: boolean;
  scopeLevel: "SYSTEM" | "DIOCESE" | "DEANERY";
  hasBack: boolean;
  cardWidthMm: number;
  cardHeightMm: number;
  cardsPerPage: number;
  paperSize: string;
  paperOrientation: string;
};

// Chi tiết một hồ sơ (khớp ParticipantDetail của BE), kèm tên hiển thị của người tạo / duyệt / điểm danh.
export type ParticipantDetail = {
  id: string;
  courseCode: string;
  courseName?: string | null;
  attendanceEnabled: boolean;
  holyName?: string | null;
  fullName: string;
  gender?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  parishName?: string | null;
  deaneryName?: string | null;
  dioceseName?: string | null;
  teamName?: string | null;
  leaderLevel?: string | null;
  email?: string | null;
  emailProblem?: string | null;
  invitationSentAt?: string | null;
  invitationError?: string | null;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
  checkedInByName?: string | null;
  registrationDate?: string | null;
  parishSubmittedAt?: string | null;
  approvalStatus?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  updatedByName?: string | null;
};
