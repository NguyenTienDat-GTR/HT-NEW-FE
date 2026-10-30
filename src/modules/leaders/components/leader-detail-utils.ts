import { serializeBaseSearch } from "@/lib/api/search";
import { formatVietnamDateValue } from "@/lib/date-format";
import { formatLeaderLevel } from "@/components/common/resource/resource-format";

export type LeaderDetail = {
  id?: string;
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  // Tên hiển thị của người tạo / người cập nhật do BE tra từ createdBy / updatedBy (mã huynh trưởng, tài khoản hoặc hệ thống).
  createdByName?: string | null;
  updatedByName?: string | null;
  status?: boolean | null;
  holyName?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  imageAssetId?: string | null;
  gender?: string | null;
  leaderLevel?: string | null;
  deaneryId?: string | null;
  deaneryName?: string | null;
  parishId?: string | null;
  parishName?: string | null;
};

export type RankHistoryRow = {
  id?: number;
  oldLevel?: string | null;
  newLevel?: string | null;
  promotionDate?: string | null;
  note?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
};

export type CourseParticipationRow = {
  id?: string;
  courseCode?: string | null;
  courseName?: string | null;
  courseTypeCode?: string | null;
  registrationDate?: string | null;
  participationStatus?: string | null;
  totalScore?: number | string | null;
  scoreHidden?: boolean | null;
  passingScore?: number | string | null;
  passed?: boolean | null;
  result?: string | null;
  review?: string | null;
  scoreNote?: string | null;
  approvalStatus?: string | null;
  certificateApprovalStatus?: string | null;
  status?: boolean | null;
};

export type CertificateRow = {
  certificateCode?: string;
  certificateName?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
  totalScore?: number | string | null;
  scoreHidden?: boolean | null;
  passingScore?: number | string | null;
  passed?: boolean | null;
  result?: string | null;
  signedBy?: string | null;
  issueDate?: string | null;
  approvalStatus?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  status?: boolean | null;
};

export type AccountRow = {
  username?: string;
  leaderId?: string | null;
  primaryRoleName?: string | null;
  roleNames?: string[] | null;
  secondaryRoleNames?: string[] | null;
  dioceseName?: string | null;
  deaneryName?: string | null;
  parishName?: string | null;
  authProvider?: string | null;
  providerId?: string | null;
  status?: boolean | null;
};

export type ActivityLogRow = {
  id?: string;
  username?: string | null;
  action?: string | null;
  module?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  httpMethod?: string | null;
  requestPath?: string | null;
  statusCode?: number | null;
  message?: string | null;
  errorMessage?: string | null;
  loggedAt?: string | null;
};

export function leaderRelatedQuery(filters: Record<string, string>, sortBy?: string) {
  return serializeBaseSearch({
    page: 0,
    size: 20,
    filters,
    sortBy,
    sortDirection: "DESC",
  }).toString();
}

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Chưa có";
  return String(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa có";
  return formatVietnamDateValue(value) ?? value;
}

export function yearFromDate(value: string | null | undefined) {
  if (!value) return 0;
  const year = Number(value.slice(0, 4));
  return Number.isInteger(year) ? year : 0;
}

export function genderLabel(value: string | null | undefined) {
  if (value === "NAM") return "Nam";
  if (value === "NU") return "Nữ";
  return displayValue(value);
}

export function workflowLabel(value: string | null | undefined) {
  if (!value) return "Chưa có";
  return value
    .replace("APPROVED", "Đã duyệt")
    .replace("REJECTED", "Từ chối")
    .replace("PENDING", "Chờ xử lý")
    .replace("SUBMITTED", "Đã gửi")
    .replace("COMPLETED", "Hoàn thành")
    .replace("UNCOMPLETED", "Chưa hoàn thành")
    .replace("REGISTERED", "Đã đăng ký")
    .replace("ATTENDED", "Đã tham dự")
    .replace("CANCELLED", "Đã hủy")
    .replace("NOT_REQUIRED", "Không yêu cầu")
    .replace("PASS", "Đạt")
    .replace("FAIL", "Không đạt")
    .replace("DAT", "Đạt")
    .replace("KHONG_DAT", "Không đạt");
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Người thao tác: ưu tiên tên do BE tra; nếu chỉ còn mã UUID (hồ sơ không còn tra được) thì không hiện mã thô cho người dùng.
export function actorLabel(name?: string | null, raw?: string | null) {
  if (name && name.trim()) return name;
  if (!raw || !raw.trim()) return "—";
  return UUID_PATTERN.test(raw.trim()) ? "Không xác định" : raw;
}

/** Câu mô tả một lần thăng cấp, vd. "Huynh trưởng cấp 1 năm 2020". */
export function rankHistorySentence(history: RankHistoryRow) {
  const level = history.newLevel ? formatLeaderLevel(history.newLevel) : "Cấp bậc chưa rõ";
  const year = yearFromDate(history.promotionDate);
  return year ? `${level} năm ${year}` : `${level} chưa có năm ghi nhận`;
}
