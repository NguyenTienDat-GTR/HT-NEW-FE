// Tên đơn vị trong dữ liệu có thể đã mang sẵn nhãn loại ("Giáo xứ Phú Hòa", "Giáo hạt Thủ Dầu Một"): chỉ thêm nhãn khi tên chưa có.
export function withUnitLabel(label: string | null | undefined, name: string | null | undefined): string {
  const unitName = (name ?? "").trim();
  const unitLabel = (label ?? "").trim();
  if (!unitLabel || unitName.toLowerCase().startsWith(unitLabel.toLowerCase())) return unitName;
  return `${unitLabel} ${unitName}`.trim();
}

// Nhãn trong dropdown chọn đơn vị cơ sở: giáo xứ chỉ hiện tên; giáo họ / giáo điểm có nhãn loại đứng trước tên
// và giáo xứ cha đứng sau, ví dụ "Giáo họ Bà Lụa - Giáo xứ Phú Cường".
export function parishOptionLabel(row: Record<string, unknown>): string {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const name = text(row.name);
  const parent = text(row.parentParishName);
  const unitLabel = text(row.unitTypeLabel);
  const isSubUnit = Boolean(parent) || (unitLabel !== "" && unitLabel !== "Giáo xứ");
  if (!isSubUnit) return name;
  return [withUnitLabel(unitLabel || "Giáo họ", name), parent].filter(Boolean).join(" - ");
}
