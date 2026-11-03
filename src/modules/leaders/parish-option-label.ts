// Nhãn trong dropdown chọn đơn vị cơ sở: giáo xứ chỉ hiện tên; giáo họ / giáo điểm thêm nhãn loại đứng trước
// và giáo xứ cha đứng sau, ví dụ "Giáo họ Bà Lụa - Phú Cường".
export function parishOptionLabel(row: Record<string, unknown>): string {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const name = text(row.name);
  const parent = text(row.parentParishName);
  const unitLabel = text(row.unitTypeLabel);
  const isSubUnit = Boolean(parent) || (unitLabel !== "" && unitLabel !== "Giáo xứ");
  if (!isSubUnit) return name;
  return [`${unitLabel || "Giáo họ"} ${name}`.trim(), parent].filter(Boolean).join(" - ");
}
