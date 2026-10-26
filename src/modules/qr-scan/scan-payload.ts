import { attendanceTokenFromScan, isLegacyAttendanceToken } from "../course-participants/attendance-token";
import { certificateCodeFromQr } from "../certificates/scan-utils";

export type ScanPayload =
  | { kind: "attendance"; token: string }
  | { kind: "certificate"; code: string }
  | { kind: "legacy-attendance" }
  | { kind: "unknown" };

// Một ô quét cho cả hai loại mã: mã điểm danh "HTATT2.<khóa>.<hồ sơ>.<chữ ký>" hoặc link chứng nhận ".../certificates/<mã>"
// (mã chứng nhận trơn của QR cũ cũng được nhận). Chuỗi mang tiền tố HTATT không bao giờ bị coi là mã chứng nhận.
export function classifyScan(raw: string): ScanPayload {
  const token = attendanceTokenFromScan(raw);
  if (token) return { kind: "attendance", token };
  if (isLegacyAttendanceToken(raw)) return { kind: "legacy-attendance" };
  if (/^\s*HTATT\d/i.test(raw)) return { kind: "unknown" };
  const code = certificateCodeFromQr(raw);
  return code ? { kind: "certificate", code } : { kind: "unknown" };
}
