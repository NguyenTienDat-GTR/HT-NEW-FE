import { columnLabel, datasetMeta, formatDateVi, formatRecordValue, isDateColumn, sanitizeFileName, sanitizeSheetName, type RecordCell } from "@/modules/analytics/record-format";
import type { RecordDataset } from "@/modules/analytics/types";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export type ExcelExportInput = {
  dataset: RecordDataset;
  /** Các cột người dùng chọn, theo thứ tự hiển thị. */
  columns: string[];
  rows: Record<string, RecordCell>[];
  /** Phần tử biểu đồ đang xem (vd. "Hồ sơ đăng ký · Nữ"); rỗng nghĩa là toàn bộ. */
  scopeTitle?: string;
  /** Khoảng thời gian đã áp dụng; danh sách huynh trưởng là ảnh chụp hiện tại nên bỏ trống. */
  period?: { from: string; to: string } | null;
  generatedAt?: Date;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function excelFileName(dataset: RecordDataset, scopeTitle: string | undefined, generatedAt: Date) {
  const day = `${pad(generatedAt.getDate())}-${pad(generatedAt.getMonth() + 1)}-${generatedAt.getFullYear()}`;
  const scope = scopeTitle ? ` - ${scopeTitle.split("·").pop()?.trim()}` : "";
  return `${sanitizeFileName(`${datasetMeta[dataset].title}${scope} - ${day}`)}.xlsx`;
}


/** Các dòng thông tin đầu sheet; dùng chung cho file thật và bản xem trước nên hai bên luôn khớp. */
export function infoLinesOf(input: Pick<ExcelExportInput, "scopeTitle" | "period" | "rows">, generatedAt: Date) {
  return [
    input.scopeTitle ? `Phạm vi: ${input.scopeTitle}` : "Phạm vi: Tất cả theo bộ lọc hiện tại",
    input.period ? `Khoảng thời gian: ${formatDateVi(input.period.from)} – ${formatDateVi(input.period.to)}` : "Thời điểm: số liệu hiện tại",
    `Ngày xuất: ${pad(generatedAt.getDate())}/${pad(generatedAt.getMonth() + 1)}/${generatedAt.getFullYear()} ${pad(generatedAt.getHours())}:${pad(generatedAt.getMinutes())}`,
    `Tổng số dòng: ${new Intl.NumberFormat("vi-VN").format(input.rows.length)}`,
  ];
}

export type SheetPreview = {
  fileName: string;
  sheetName: string;
  title: string;
  infoLines: string[];
  headers: string[];
  rows: string[][];
  total: number;
  shown: number;
};

/** Bản xem trước đúng nội dung sẽ ghi vào file: tên file, tên sheet, dòng thông tin, tiêu đề cột và các dòng đầu đã định dạng tiếng Việt. */
export function buildSheetPreview(input: ExcelExportInput, limit = 12): SheetPreview {
  const generatedAt = input.generatedAt ?? new Date();
  const meta = datasetMeta[input.dataset];
  const rows = input.rows.slice(0, limit).map((record) => input.columns.map((column) => formatRecordValue(column, record[column])));
  return {
    fileName: excelFileName(input.dataset, input.scopeTitle, generatedAt),
    sheetName: sanitizeSheetName(meta.sheet),
    title: meta.title,
    infoLines: infoLinesOf(input, generatedAt),
    headers: input.columns.map(columnLabel),
    rows,
    total: input.rows.length,
    shown: rows.length,
  };
}

/** Ô ngày thành giá trị ngày thật (lọc/sắp xếp được trong Excel) hiển thị dd/mm/yyyy; còn lại là chuỗi hoặc số. */
function cellValue(column: string, value: RecordCell): string | number | Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") return value;
  if (isDateColumn(column)) {
    const match = ISO_DATE.exec(value);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : value;
  }
  return null;
}

/** Xuất .xlsx hoàn toàn tiếng Việt: tên file, tên sheet, tiêu đề, tiêu đề cột và nội dung ô. exceljs được nạp khi bấm xuất nên không làm nặng trang. */
export async function buildWorkbook(input: ExcelExportInput) {
  const { default: ExcelJS } = await import("exceljs");
  const generatedAt = input.generatedAt ?? new Date();
  const meta = datasetMeta[input.dataset];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hệ thống quản lý huynh trưởng";
  workbook.title = meta.title;
  workbook.created = generatedAt;

  const sheet = workbook.addWorksheet(sanitizeSheetName(meta.sheet), { properties: { defaultRowHeight: 20 } });
  const lastColumn = Math.max(input.columns.length, 4);

  const infoLines = infoLinesOf(input, generatedAt);

  const titleRow = sheet.addRow([meta.title]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, lastColumn);
  titleRow.height = 30;
  titleRow.getCell(1).font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF1E40AF" } };
  titleRow.getCell(1).alignment = { vertical: "middle" };
  for (const line of infoLines) {
    const row = sheet.addRow([line]);
    sheet.mergeCells(row.number, 1, row.number, lastColumn);
    row.getCell(1).font = { name: "Calibri", size: 11, color: { argb: "FF475569" } };
  }
  sheet.addRow([]);

  const header = sheet.addRow(input.columns.map(columnLabel));
  header.height = 26;
  header.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { top: { style: "thin", color: { argb: "FFCBD5E1" } }, bottom: { style: "thin", color: { argb: "FFCBD5E1" } }, left: { style: "thin", color: { argb: "FFCBD5E1" } }, right: { style: "thin", color: { argb: "FFCBD5E1" } } };
  });

  const widths = input.columns.map((column) => columnLabel(column).length + 2);
  input.rows.forEach((record, index) => {
    const values = input.columns.map((column) => {
      const raw = cellValue(column, record[column]);
      if (raw !== null) return raw;
      const text = record[column];
      return text === null || text === undefined ? "" : formatRecordValue(column, text);
    });
    const row = sheet.addRow(values);
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const column = input.columns[columnNumber - 1];
      cell.font = { name: "Calibri", size: 11 };
      cell.border = { bottom: { style: "hair", color: { argb: "FFCBD5E1" } } };
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      if (cell.value instanceof Date) {
        cell.numFmt = "dd/mm/yyyy";
        cell.alignment = { horizontal: "center" };
      } else if (typeof cell.value === "number") {
        cell.numFmt = column === "score" ? "0.00" : "#,##0";
        cell.alignment = { horizontal: "right" };
      }
      const length = cell.value instanceof Date ? 10 : String(cell.value ?? "").length;
      widths[columnNumber - 1] = Math.max(widths[columnNumber - 1], length + 2);
    });
  });

  input.columns.forEach((_, index) => {
    sheet.getColumn(index + 1).width = Math.min(Math.max(widths[index], 10), 48);
  });
  sheet.views = [{ state: "frozen", ySplit: header.number, xSplit: 0 }];
  sheet.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number, column: input.columns.length } };

  return workbook;
}

export async function exportRecordsToExcel(input: ExcelExportInput) {
  const generatedAt = input.generatedAt ?? new Date();
  const workbook = await buildWorkbook({ ...input, generatedAt });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = excelFileName(input.dataset, input.scopeTitle, generatedAt);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return link.download;
}
