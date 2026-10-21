// Mã QR chứng nhận chứa mã chứng nhận. Chấp nhận cả đường dẫn có chứa mã (lấy đoạn cuối).
export function certificateCodeFromQr(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    text = url.pathname.split("/").filter(Boolean).pop() ?? "";
    text = decodeURIComponent(text);
  } catch {
    // Không phải URL: dùng nguyên văn.
  }
  text = text.trim();
  // Mã chứng nhận dạng GPPC-HTI-2026-1: không chứa khoảng trắng hay ký tự đường dẫn.
  return /^[^\s/\\?#]{3,100}$/.test(text) ? text : null;
}

export function certificateDetailHref(code: string): string {
  return `/certificates/${encodeURIComponent(code)}`;
}
