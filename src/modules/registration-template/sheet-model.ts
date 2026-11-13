/** Tiện ích địa chỉ ô kiểu Excel (A1) dùng cho trình soạn mẫu. Chỉ số cột/dòng ở đây tính từ 1 như exceljs. */

export function colLetter(col: number) {
  let n = col;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function cellAddress(row: number, col: number) {
  return `${colLetter(col)}${row}`;
}

export function parseAddress(address: string): { row: number; col: number } | null {
  const match = /^([A-Z]{1,3})(\d{1,6})$/i.exec(address.trim());
  if (!match) return null;
  let col = 0;
  for (const ch of match[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(match[2]), col };
}

export type MergeRange = { r1: number; c1: number; r2: number; c2: number };

export function parseMerge(range: string): MergeRange | null {
  const [a, b] = range.split(":");
  const start = a ? parseAddress(a) : null;
  const end = b ? parseAddress(b) : start;
  if (!start || !end) return null;
  return { r1: start.row, c1: start.col, r2: end.row, c2: end.col };
}

export type TokenMod = "upper" | "lower" | "title";
export type CaseMode = TokenMod | "none";

const TOKEN_PATTERN = /\{\{\s*([A-Za-z]+)\s*(?:\|\s*(upper|lower|title)\s*)?\}\}/g;

/** Chia chữ thành đoạn thường và đoạn {{trường}} (có thể kèm |upper / |lower) để hiển thị trường như nhãn. */
export function splitTokens(text: string): { text: string; key?: string; mod?: TokenMod }[] {
  const parts: { text: string; key?: string; mod?: TokenMod }[] = [];
  const pattern = new RegExp(TOKEN_PATTERN.source, "g");
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[0], key: match[1], mod: (match[2] as TokenMod | undefined) ?? undefined });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/**
 * Đổi chữ hoa / thường như Excel: chữ thường trong ô đổi ngay; trường {{...}} được gắn |upper / |lower để khi xuất ra
 * giá trị thật của trường được đổi hoa / thường theo (none: bỏ chuyển đổi của trường, chữ thường giữ nguyên).
 */
/** Viết hoa chữ cái đầu mỗi từ, còn lại viết thường. */
export function titleCase(text: string): string {
  return text.toLocaleLowerCase("vi-VN").replace(/(^|[\s(/-])(\p{L})/gu, (_match, lead: string, letter: string) => lead + letter.toLocaleUpperCase("vi-VN"));
}

export function changeCase(text: string, mode: CaseMode): string {
  return splitTokens(text)
    .map((part) => {
      if (part.key) return mode === "none" ? `{{${part.key}}}` : `{{${part.key}|${mode}}}`;
      if (mode === "title") return titleCase(part.text);
      if (mode === "upper") return part.text.toLocaleUpperCase("vi-VN");
      if (mode === "lower") return part.text.toLocaleLowerCase("vi-VN");
      return part.text;
    })
    .join("");
}

/** Bố cục gợi ý theo mẫu danh sách đăng ký thường dùng; toàn bộ là trường động nên dùng được cho mọi khóa và cấp. */
export function starterLayout(sheet: import("exceljs").Worksheet) {
  const widths = [6, 13, 28, 13, 9, 11, 16, 26, 22];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  const thin = { style: "thin" as const };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const font = (size: number, bold = false) => ({ name: "Times New Roman", size, bold });
  const center = { horizontal: "center" as const, vertical: "middle" as const, wrapText: true };
  const put = (address: string, value: string, opts: { size?: number; bold?: boolean; align?: "left" | "center" | "right"; merge?: string; border?: boolean } = {}) => {
    if (opts.merge) sheet.mergeCells(opts.merge);
    const cell = sheet.getCell(address);
    cell.value = value;
    cell.font = font(opts.size ?? 12, opts.bold);
    cell.alignment = { horizontal: opts.align ?? "left", vertical: "middle", wrapText: true };
    if (opts.border) cell.border = box;
  };
  put("A1", "THIẾU NHI THÁNH THỂ GIÁO PHẬN {{tenGiaoPhan}}\n{{capVaTenDonVi}}", { merge: "A1:I1", bold: true, align: "center" });
  sheet.getRow(1).height = 40;
  put("A3", "DANH SÁCH THAM DỰ {{tenKhoa|upper}}", { merge: "A3:I3", size: 16, bold: true, align: "center" });
  sheet.getRow(3).height = 28;
  put("B5", "Kính gửi: Cha Tuyên Úy {{capDonVi}} và Quý Trưởng trong Ban Nghiên Huấn.", { merge: "B5:I5", bold: true });
  put("B6", "Xứ đoàn: {{tenXuDoan}}", { merge: "B6:C6" });
  put("D6", "Giáo xứ: {{tenGiaoXu}}", { merge: "D6:G6" });
  put("B7", "Xin gửi đến Quý Cha và Quý Trưởng danh sách tham dự {{tenKhoa}} như sau:", { merge: "B7:I7" });
  const heads = ["STT", "Tên Thánh", "Họ & Tên", "Ngày Sinh", "Giới Tính", "HT cấp I năm", "Số Điện Thoại", "Email", "Ghi Chú"];
  const tokens = ["{{stt}}", "{{tenThanh}}", "{{hoVaTen}}", "{{ngaySinh}}", "{{gioiTinh}}", "{{namDatCap}}", "{{soDienThoai}}", "{{email}}", "{{ghiChu}}"];
  heads.forEach((head, index) => {
    const cell = sheet.getCell(9, index + 1);
    cell.value = head;
    cell.font = font(12, true);
    cell.alignment = center;
    cell.border = box;
  });
  tokens.forEach((token, index) => {
    const cell = sheet.getCell(10, index + 1);
    cell.value = token;
    cell.font = font(12);
    cell.alignment = { vertical: "middle", horizontal: index === 0 || index === 3 || index === 4 || index === 5 ? "center" : "left", wrapText: true };
    cell.border = box;
  });
  put("B12", "Danh sách này đã được xem xét và có sự cho phép của Cha Chánh Xứ (Cha Tuyên úy xứ đoàn).", { merge: "B12:I12" });
  put("F14", "……………, ngày {{ngay}} tháng {{thang}} năm {{nam}}", { merge: "F14:I14", align: "center" });
  put("B15", "XÁC NHẬN CỦA XỨ ĐOÀN TRƯỞNG", { merge: "B15:C15", bold: true, align: "center" });
  put("F15", "CHUẨN NHẬN CỦA CHA TUYÊN ÚY", { merge: "F15:I15", bold: true, align: "center" });
}
