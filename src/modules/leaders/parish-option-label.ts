// Nhãn trong dropdown chọn đơn vị cơ sở: luôn ghi rõ loại đơn vị và giáo hạt, ví dụ
// "Giáo xứ A - Giáo hạt X" hoặc "Giáo họ B (thuộc Giáo xứ A) - Giáo hạt X".
export function parishOptionLabel(row: Record<string, unknown>): string {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const name = text(row.name);
  const unitLabel = text(row.unitTypeLabel) || "Giáo xứ";
  const parent = text(row.parentParishName);
  const deanery = text(row.deaneryName);
  const unit = `${unitLabel} ${name}`.trim();
  const withParent = parent ? `${unit} (thuộc Giáo xứ ${parent})` : unit;
  return deanery ? `${withParent} - Giáo hạt ${deanery}` : withParent;
}
