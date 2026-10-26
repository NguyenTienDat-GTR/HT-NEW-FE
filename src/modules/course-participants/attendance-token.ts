const PREFIX = "HTATT2.";
const LEGACY_PREFIX = "HTATT1.";

// Mã QR điểm danh có dạng "HTATT2.<mã khóa>.<mã hồ sơ>.<chữ ký>". FE chỉ kiểm tra hình dạng để báo lỗi sớm, chữ ký do BE xác thực.
// Máy quét ngoài (súng quét USB) có thể thêm xuống dòng / khoảng trắng ở đầu cuối.
export function attendanceTokenFromScan(raw: string): string | null {
  const text = (raw.split(/\r?\n/)[0] ?? "").trim();
  if (!text.startsWith(PREFIX)) return null;
  const parts = text.split(".");
  if (parts.length !== 4 || !parts[1] || !parts[2] || !parts[3]) return null;
  if (/\s/.test(text) || text.length > 200) return null;
  return text;
}

// Mã điểm danh phiên bản cũ (chưa có mã khóa) đã in thẻ / gửi email trước đây: không còn dùng được.
export function isLegacyAttendanceToken(raw: string): boolean {
  return raw.trim().startsWith(LEGACY_PREFIX);
}

export const LEGACY_ATTENDANCE_MESSAGE = "Đây là mã QR điểm danh phiên bản cũ (chưa có thông tin khóa huấn luyện). Hãy xuất lại thẻ hoặc gửi lại email thông tin tham dự để có mã mới.";

// Gợi ý khi quét nhầm loại mã (ví dụ mã chứng nhận thay vì mã điểm danh).
export function explainRejectedScan(raw: string): string {
  const text = raw.trim();
  if (isLegacyAttendanceToken(text)) return LEGACY_ATTENDANCE_MESSAGE;
  if (/^https?:\/\/.+\/certificates\//i.test(text)) {
    return "Đây là mã QR của chứng nhận, không phải mã điểm danh. Hãy quét mã trên thẻ tham dự.";
  }
  return "Mã QR không phải mã điểm danh của hệ thống. Hãy quét mã trên thẻ tham dự hoặc trong email.";
}
