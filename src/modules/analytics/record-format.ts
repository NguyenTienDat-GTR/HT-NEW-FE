import { keyLabel } from "@/modules/analytics/labels";
import type { RecordDataset } from "@/modules/analytics/types";

export type RecordCell = string | number | boolean | null | undefined;

/** Tên hiển thị và tên file/sheet (tiếng Việt) của từng loại danh sách. */
export const datasetMeta: Record<RecordDataset, { title: string; sheet: string }> = {
  leaders: { title: "Danh sách huynh trưởng", sheet: "Huynh trưởng" },
  participations: { title: "Danh sách hồ sơ đăng ký khóa huấn luyện", sheet: "Hồ sơ đăng ký" },
  certificates: { title: "Danh sách chứng nhận", sheet: "Chứng nhận" },
};

/** Nhãn cột bằng tiếng Việt; dùng cho bảng chi tiết, hộp chọn cột và tiêu đề cột trong file Excel. */
export const recordColumnLabels: Record<string, string> = {
  id: "Mã",
  code: "Mã chứng nhận",
  name: "Tên thánh và họ tên",
  leaderName: "Tên thánh và họ tên",
  gender: "Giới tính",
  birthDate: "Ngày sinh",
  leaderLevel: "Cấp bậc",
  parish: "Giáo xứ",
  deanery: "Giáo hạt",
  active: "Đang hoạt động",
  createdDate: "Ngày tạo hồ sơ",
  courseName: "Khóa học",
  courseType: "Loại khóa",
  issueDate: "Ngày cấp",
  startDate: "Ngày bắt đầu khóa",
  endDate: "Ngày kết thúc khóa",
  registrationDate: "Ngày đăng ký",
  approvalStatus: "Trạng thái duyệt",
  systemSuggested: "Hệ thống gợi ý",
  exceptionApproved: "Duyệt ngoại lệ",
  participationStatus: "Trạng thái tham dự",
  result: "Kết quả",
  score: "Điểm",
  certificateStatus: "Trạng thái chứng nhận",
};

const DATE_COLUMNS = new Set(["birthDate", "createdDate", "issueDate", "startDate", "endDate", "registrationDate"]);
const ENUM_COLUMNS = new Set(["gender", "approvalStatus", "participationStatus", "certificateStatus"]);
const RESULT_LABELS: Record<string, string> = { COMPLETED: "Đạt", UNCOMPLETED: "Chưa đạt" };

export const isDateColumn = (column: string) => DATE_COLUMNS.has(column);

/** Cột nào được phép xuất: bỏ mã nội bộ (UUID); mã chứng nhận là mã nghiệp vụ nên giữ. */
export const exportableColumns = (columns: string[]) => columns.filter((column) => column !== "id");

export function columnLabel(column: string) {
  return recordColumnLabels[column] ?? column;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatDateVi(value: string) {
  const match = ISO_DATE.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** Giá trị hiển thị tiếng Việt của một ô: ngày dd/mm/yyyy, Có/Không, trạng thái và kết quả đã dịch. */
export function formatRecordValue(column: string, value: RecordCell): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number" && /year$/i.test(column)) return String(value);
  if (typeof value === "number") return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
  if (DATE_COLUMNS.has(column)) return formatDateVi(value);
  if (column === "result") return RESULT_LABELS[value] ?? value;
  if (ENUM_COLUMNS.has(column)) return keyLabel(value);
  return value;
}

/** Tên file hợp lệ trên Windows/macOS nhưng vẫn giữ dấu tiếng Việt. */
export function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Tên sheet Excel: tối đa 31 ký tự và không chứa \ / ? * [ ] :. */
export function sanitizeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, "-").trim().slice(0, 31) || "Dữ liệu";
}
