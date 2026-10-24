const PREFIX = "HTATT1.";

// Mã QR điểm danh có dạng "HTATT1.<mã hồ sơ>.<chữ ký>". FE chỉ kiểm tra hình dạng để báo lỗi sớm, chữ ký do BE xác thực.
// Máy quét ngoài (súng quét USB) có thể thêm xuống dòng / khoảng trắng ở đầu cuối.
export function attendanceTokenFromScan(raw: string): string | null {
  const text = (raw.split(/\r?\n/)[0] ?? "").trim();
  if (!text.startsWith(PREFIX)) return null;
  const parts = text.split(".");
  if (parts.length !== 3 || !parts[1] || !parts[2]) return null;
  if (/\s/.test(text) || text.length > 200) return null;
  return text;
}

export type ScanRejection = "CERTIFICATE_QR" | "UNKNOWN";

// Gợi ý khi quét nhầm loại mã (ví dụ mã chứng nhận thay vì mã điểm danh).
export function explainRejectedScan(raw: string): string {
  const text = raw.trim();
  if (/^https?:\/\/.+\/certificates\//i.test(text)) {
    return "Đây là mã QR của chứng nhận, không phải mã điểm danh. Hãy quét mã trên thẻ tham dự.";
  }
  return "Mã QR không phải mã điểm danh của hệ thống. Hãy quét mã trên thẻ tham dự hoặc trong email.";
}
