import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ownStyle } from "@/modules/registration-template/cell-style";

// Mẫu đã lưu rồi mở lại: mọi ô cùng styleId dùng chung một đối tượng style.
async function reload() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Mẫu");
  for (const address of ["A1", "B1", "C1"]) {
    sheet.getCell(address).value = address;
    sheet.getCell(address).font = { name: "Times New Roman", size: 12 };
  }
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  return loaded.worksheets[0];
}

describe("style ô sau khi mở lại file", () => {
  it("không tách style thì đổi font một ô làm đổi các ô khác (lỗi gốc)", async () => {
    const sheet = await reload();
    sheet.getCell("A1").font = { ...sheet.getCell("A1").font, bold: true };
    expect(sheet.getCell("B1").font?.bold).toBe(true);
  });

  it("ownStyle: chỉ ô được đổi mới đổi", async () => {
    const sheet = await reload();
    const cell = ownStyle(sheet.getCell("A1"));
    cell.font = { ...cell.font, bold: true };
    cell.alignment = { horizontal: "center" };
    expect(sheet.getCell("A1").font?.bold).toBe(true);
    expect(sheet.getCell("B1").font?.bold).toBeUndefined();
    expect(sheet.getCell("C1").font?.bold).toBeUndefined();
    expect(sheet.getCell("B1").alignment?.horizontal).toBeUndefined();
  });
});
