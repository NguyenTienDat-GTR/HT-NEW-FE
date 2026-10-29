// Tên đơn vị hiển thị gọn trong bảng: "Giáo xứ Lái Thiêu" -> "Lái Thiêu", "Giáo hạt Thủ Dầu Một" -> "Thủ Dầu Một".
// Chỉ bỏ tiền tố khi phần còn lại không rỗng.
const UNIT_PREFIX = /^\s*giáo\s+(xứ|hạt|họ|điểm|phận)\s+/iu;

export function shortUnitName(name: string | null | undefined): string {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  const stripped = trimmed.replace(UNIT_PREFIX, "").trim();
  return stripped || trimmed;
}
