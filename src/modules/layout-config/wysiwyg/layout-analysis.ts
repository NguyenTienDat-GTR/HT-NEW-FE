import { DEFAULT_PHOTO_SIZE, DEFAULT_QR_SIZE, photoAspect, type LayoutItem } from "@/modules/certificates/components/certificate-design";
import type { ItemBox } from "./layout-ops";

export type WarningLevel = "error" | "warn" | "info";

export type LayoutWarning = {
  id: string;
  level: WarningLevel;
  message: string;
  /** Phần tử liên quan (bấm vào cảnh báo để chọn). */
  indexes: number[];
};

export type AnalysisContext = {
  layout: LayoutItem[];
  pageWidthMm: number;
  pageHeightMm: number;
  /** Nội dung sẽ in của phần tử chữ (dữ liệu mẫu cho trường, nội dung tĩnh cho văn bản). */
  textOf: (item: LayoutItem) => string;
  /** Đo chiều rộng chữ (tỉ lệ chiều rộng trang). Không có thì ước lượng theo số ký tự. */
  measureWidth?: (item: LayoutItem, text: string) => number | null;
  /** Vùng an toàn (mm) tính từ mép; 0 = không kiểm tra. */
  safeMm?: number;
  /** Kích thước thật của ảnh nền để kiểm tra độ phân giải. */
  background?: { naturalWidth: number; naturalHeight: number } | null;
};

export const MIN_FONT_PT = 6;
export const MIN_QR_MM = 15;
export const MIN_DPI = 150;
const PT_PER_MM = 72 / 25.4;
const OVERLAP_RATIO = 0.25;

const isText = (item: LayoutItem) => item.type === "FIELD" || item.type === "TEXT";

/** Hộp bao (tỉ lệ 0..1 của trang) của một phần tử; chữ được ước lượng từ nội dung và cỡ chữ. */
export function itemBox(item: LayoutItem, ctx: Pick<AnalysisContext, "pageWidthMm" | "pageHeightMm" | "textOf" | "measureWidth">): ItemBox {
  const aspect = ctx.pageWidthMm / ctx.pageHeightMm;
  if (item.type === "QR") {
    const side = item.size ?? DEFAULT_QR_SIZE;
    return { left: item.x - side / aspect / 2, right: item.x + side / aspect / 2, top: item.y - side / 2, bottom: item.y + side / 2 };
  }
  if (item.type === "PHOTO") {
    const height = item.size ?? DEFAULT_PHOTO_SIZE;
    const width = (height * photoAspect(item)) / aspect;
    return { left: item.x - width / 2, right: item.x + width / 2, top: item.y - height / 2, bottom: item.y + height / 2 };
  }
  const text = ctx.textOf(item);
  const width = text ? (ctx.measureWidth?.(item, text) ?? (text.length * 0.56 * item.fontSize) / aspect) : 0;
  const height = item.fontSize * 1.2;
  const left = item.align === "left" ? item.x : item.align === "right" ? item.x - width : item.x - width / 2;
  return { left, right: left + width, top: item.y - height / 2, bottom: item.y + height / 2 };
}

function overlapRatio(a: ItemBox, b: ItemBox): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  const smaller = Math.min((a.right - a.left) * (a.bottom - a.top), (b.right - b.left) * (b.bottom - b.top));
  return smaller <= 0 ? 0 : (w * h) / smaller;
}

/** Kiểm tra bố cục và trả về cảnh báo cho người thiết kế (chữ quá nhỏ, tràn trang, chồng nhau, QR nhỏ, ảnh nền mờ...). */
export function analyzeLayout(ctx: AnalysisContext): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const visible = ctx.layout.map((item, index) => ({ item, index })).filter(({ item }) => !item.hidden);
  const boxes = new Map(visible.map(({ item, index }) => [index, itemBox(item, ctx)]));

  for (const { item, index } of visible) {
    if (isText(item)) {
      const pt = item.fontSize * ctx.pageHeightMm * PT_PER_MM;
      if (pt < MIN_FONT_PT) {
        warnings.push({ id: `small-${index}`, level: "warn", indexes: [index], message: `Chữ ${pt.toFixed(1)}pt nhỏ hơn ${MIN_FONT_PT}pt, khó đọc khi in` });
      }
      if (!ctx.textOf(item).trim()) {
        warnings.push({ id: `empty-${index}`, level: "info", indexes: [index], message: "Phần tử chữ chưa có nội dung" });
      }
    }
    if (item.type === "QR") {
      const mm = (item.size ?? DEFAULT_QR_SIZE) * ctx.pageHeightMm;
      if (mm < MIN_QR_MM) {
        warnings.push({ id: `qr-${index}`, level: "warn", indexes: [index], message: `Mã QR ${mm.toFixed(0)}mm nhỏ hơn ${MIN_QR_MM}mm, máy quét khó đọc` });
      }
    }
    const box = boxes.get(index)!;
    const eps = 0.001;
    if (box.left < -eps || box.right > 1 + eps || box.top < -eps || box.bottom > 1 + eps) {
      warnings.push({ id: `out-${index}`, level: "error", indexes: [index], message: "Phần tử vượt ra ngoài trang, phần tràn sẽ bị cắt khi in" });
    } else if (ctx.safeMm && ctx.safeMm > 0) {
      const safeX = ctx.safeMm / ctx.pageWidthMm;
      const safeY = ctx.safeMm / ctx.pageHeightMm;
      if (box.left < safeX || box.right > 1 - safeX || box.top < safeY || box.bottom > 1 - safeY) {
        warnings.push({ id: `safe-${index}`, level: "warn", indexes: [index], message: `Phần tử nằm sát mép (trong ${ctx.safeMm}mm), dễ bị cắt khi in` });
      }
    }
  }

  // Chồng nhau: chỉ báo mỗi cặp một lần; bỏ qua ảnh với văn bản vì thường cố ý đặt trên ảnh nền.
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i];
      const b = visible[j];
      if (!isText(a.item) && !isText(b.item) && a.item.type !== b.item.type) continue;
      if (overlapRatio(boxes.get(a.index)!, boxes.get(b.index)!) > OVERLAP_RATIO) {
        warnings.push({ id: `overlap-${a.index}-${b.index}`, level: "warn", indexes: [a.index, b.index], message: "Hai phần tử chồng lên nhau" });
      }
    }
  }

  const fieldCounts = new Map<string, number[]>();
  for (const { item, index } of visible) {
    if (item.type === "FIELD" && item.fieldKey) fieldCounts.set(item.fieldKey, [...(fieldCounts.get(item.fieldKey) ?? []), index]);
  }
  for (const [key, indexes] of fieldCounts) {
    if (indexes.length > 1) {
      warnings.push({ id: `dup-${key}`, level: "info", indexes, message: `Trường "${key}" xuất hiện ${indexes.length} lần` });
    }
  }

  if (ctx.background && ctx.background.naturalWidth > 0) {
    const dpi = ctx.background.naturalWidth / (ctx.pageWidthMm / 25.4);
    if (dpi < MIN_DPI) {
      warnings.push({ id: "bg-dpi", level: "warn", indexes: [], message: `Ảnh nền chỉ khoảng ${Math.round(dpi)} dpi (nên từ ${MIN_DPI} dpi), in ra có thể bị mờ` });
    }
  }

  const order: Record<WarningLevel, number> = { error: 0, warn: 1, info: 2 };
  return warnings.sort((a, b) => order[a.level] - order[b.level]);
}
