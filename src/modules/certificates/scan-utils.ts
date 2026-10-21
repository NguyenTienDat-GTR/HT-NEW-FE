// Mã QR chứa link .../certificates/{mã}. Trình quét trong hệ thống chỉ lấy mã rồi điều hướng nội bộ một lần
// (không mở lại link đầy đủ). Vẫn nhận mã trơn của các QR cũ.
export function certificateCodeFromQr(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) {
    try {
      const segments = new URL(text).pathname.split("/").filter(Boolean);
      if (segments.length < 2 || segments[segments.length - 2] !== "certificates") return null;
      text = decodeURIComponent(segments[segments.length - 1] ?? "");
    } catch {
      return null;
    }
  }
  text = text.trim();
  // Mã chứng nhận dạng GPPC-HTI-2026-1: không chứa khoảng trắng hay ký tự đường dẫn.
  return /^[^\s/\\?#]{3,100}$/.test(text) ? text : null;
}

export function certificateDetailHref(code: string): string {
  return `/certificates/${encodeURIComponent(code)}`;
}
