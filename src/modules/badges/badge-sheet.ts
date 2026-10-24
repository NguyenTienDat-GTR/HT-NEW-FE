// Hình học xếp thẻ lên khổ giấy (mm). Khớp BadgeSheetLayout ở BE: BE là nơi quyết định số thẻ thực tế khi xuất PDF,
// bản này chỉ để xem trước và báo lỗi sớm trong trình soạn.

export type PaperSize = "A3" | "A4" | "A5" | "LETTER" | "LEGAL";
export type Orientation = "PORTRAIT" | "LANDSCAPE";
export type FlipEdge = "LONG" | "SHORT";

export const PAPER_SIZES: { value: PaperSize; label: string }[] = [
  { value: "A4", label: "A4 (210 × 297 mm)" },
  { value: "A3", label: "A3 (297 × 420 mm)" },
  { value: "A5", label: "A5 (148 × 210 mm)" },
  { value: "LETTER", label: "Letter (216 × 279 mm)" },
  { value: "LEGAL", label: "Legal (216 × 356 mm)" },
];

const PAPER_MM: Record<PaperSize, [number, number]> = {
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  LETTER: [215.9, 279.4],
  LEGAL: [215.9, 355.6],
};

export const MIN_CARD_MM = 20;
export const MAX_CARD_MM = 400;
export const MAX_MARGIN_MM = 50;
export const MAX_GAP_MM = 30;
export const DEFAULT_CARD = { widthMm: 90, heightMm: 55, marginMm: 10, gapMm: 0 };

export type CardPreset = { id: string; label: string; widthMm: number; heightMm: number; hint: string };

// Kích thước thẻ gợi ý (theo chiều ngang; chọn "dọc" sẽ tự đổi chiều).
export const CARD_PRESETS: CardPreset[] = [
  { id: "badge-90x55", label: "Thẻ 90 × 55 mm", widthMm: 90, heightMm: 55, hint: "Cỡ danh thiếp, 10 thẻ / A4" },
  { id: "badge-85x54", label: "Thẻ 85,6 × 54 mm (CR80)", widthMm: 85.6, heightMm: 54, hint: "Cỡ thẻ ngân hàng, 10 thẻ / A4" },
  { id: "badge-100x70", label: "Thẻ 100 × 70 mm", widthMm: 100, heightMm: 70, hint: "Thẻ đeo lớn, 6–8 thẻ / A4" },
  { id: "badge-105x74", label: "Thẻ 105 × 74 mm (A7)", widthMm: 105, heightMm: 74.25, hint: "Thẻ đeo cỡ A7, 8 thẻ / A4" },
  { id: "badge-148x105", label: "Thẻ 148 × 105 mm (A6)", widthMm: 148, heightMm: 105, hint: "Thẻ đeo cỡ A6, 4 thẻ / A4" },
  { id: "badge-210x148", label: "Thẻ 210 × 148 mm (A5)", widthMm: 210, heightMm: 148, hint: "Thẻ lớn cỡ A5, 2 thẻ / A4" },
];

export function paperMm(paperSize: string | undefined, orientation: string | undefined): [number, number] {
  const size = (paperSize ?? "A4").trim().toUpperCase() as PaperSize;
  const [w, h] = PAPER_MM[size] ?? PAPER_MM.A4;
  return orientation === "LANDSCAPE" ? [h, w] : [w, h];
}

export function isKnownPaper(paperSize: string | undefined) {
  return Boolean(paperSize) && (paperSize as string).trim().toUpperCase() in PAPER_MM;
}

// Đổi chiều thẻ: LANDSCAPE → cạnh dài nằm ngang (rộng ≥ cao); PORTRAIT → cạnh dài thẳng đứng (rộng ≤ cao).
export function orientCard(widthMm: number, heightMm: number, orientation: Orientation): { widthMm: number; heightMm: number } {
  const long = Math.max(widthMm, heightMm);
  const short = Math.min(widthMm, heightMm);
  return orientation === "LANDSCAPE" ? { widthMm: long, heightMm: short } : { widthMm: short, heightMm: long };
}

export type Grid = {
  columns: number;
  rows: number;
  perPage: number;
  paperWidthMm: number;
  paperHeightMm: number;
  cardWidthMm: number;
  cardHeightMm: number;
  gapMm: number;
  originXMm: number;
  originYMm: number;
};

// Số cột / hàng và vị trí lưới (căn giữa vùng in); null khi không xếp nổi một thẻ.
export function computeGrid(paperWidthMm: number, paperHeightMm: number, cardWidthMm: number, cardHeightMm: number, marginMm: number, gapMm: number): Grid | null {
  const usableWidth = paperWidthMm - 2 * marginMm;
  const usableHeight = paperHeightMm - 2 * marginMm;
  if (!(cardWidthMm > 0) || !(cardHeightMm > 0) || usableWidth <= 0 || usableHeight <= 0) return null;
  // Sai số nhỏ để thẻ vừa khít không bị loại do làm tròn số thực.
  const columns = Math.floor((usableWidth + gapMm) / (cardWidthMm + gapMm) + 1e-9);
  const rows = Math.floor((usableHeight + gapMm) / (cardHeightMm + gapMm) + 1e-9);
  if (columns < 1 || rows < 1) return null;
  const gridWidth = columns * cardWidthMm + (columns - 1) * gapMm;
  const gridHeight = rows * cardHeightMm + (rows - 1) * gapMm;
  return {
    columns,
    rows,
    perPage: columns * rows,
    paperWidthMm,
    paperHeightMm,
    cardWidthMm,
    cardHeightMm,
    gapMm,
    originXMm: marginMm + (usableWidth - gridWidth) / 2,
    originYMm: marginMm + (usableHeight - gridHeight) / 2,
  };
}

// Góc trên-trái (mm) của thẻ thứ index (0-based, theo hàng từ trên xuống); mirror* dùng cho mặt sau khi in hai mặt.
export function cardPosition(grid: Grid, index: number, mirrorColumns = false, mirrorRows = false): [number, number] {
  let column = index % grid.columns;
  let row = Math.floor(index / grid.columns);
  if (mirrorColumns) column = grid.columns - 1 - column;
  if (mirrorRows) row = grid.rows - 1 - row;
  return [grid.originXMm + column * (grid.cardWidthMm + grid.gapMm), grid.originYMm + row * (grid.cardHeightMm + grid.gapMm)];
}

// Lật theo cạnh dài của giấy đứng (hoặc cạnh ngắn của giấy ngang) đổi cột trái ↔ phải; ngược lại đổi hàng trên ↔ dưới.
export function mirrorColumnsFor(paperWidthMm: number, paperHeightMm: number, flipEdge: FlipEdge) {
  const portrait = paperWidthMm <= paperHeightMm;
  return portrait === (flipEdge === "LONG");
}

export function pageCount(participants: number, grid: Grid | null, duplex: boolean) {
  if (!grid || participants <= 0) return 0;
  const sheets = Math.ceil(participants / grid.perPage);
  return duplex ? sheets * 2 : sheets;
}

export function formatMm(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100).replace(".", ",");
}
