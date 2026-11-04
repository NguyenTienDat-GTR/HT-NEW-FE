import type { LayoutItem } from "@/modules/certificates/components/certificate-design";

export type AlignMode = "left" | "centerX" | "right" | "top" | "middleY" | "bottom";
export type DistributeAxis = "x" | "y";

// Hộp bao (tỉ lệ 0..1 của trang) của một phần tử.
export type ItemBox = { left: number; right: number; top: number; bottom: number };

export type BoxOf = (item: LayoutItem, index: number) => ItemBox;

/** Hộp bao mặc định khi chưa đo được DOM: điểm neo (chữ) hoặc ô vuông theo size (QR). */
export function fallbackBox(item: LayoutItem): ItemBox {
  if (item.type === "QR") {
    const half = (item.size ?? 0.15) / 2;
    return { left: item.x - half, right: item.x + half, top: item.y - half, bottom: item.y + half };
  }
  return { left: item.x, right: item.x, top: item.y, bottom: item.y };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function shift(item: LayoutItem, dx: number, dy: number): LayoutItem {
  return { ...item, x: clamp01(item.x + dx), y: clamp01(item.y + dy) };
}

/** Căn các phần tử được chọn: một phần tử thì căn theo trang, từ hai phần tử trở lên thì căn theo hộp bao của cả nhóm. */
export function alignItems(layout: LayoutItem[], selection: number[], mode: AlignMode, boxOf: BoxOf = fallbackBox): LayoutItem[] {
  const chosen = selection.filter((i) => layout[i]);
  if (chosen.length === 0) return layout;
  const boxes = new Map(chosen.map((i) => [i, boxOf(layout[i], i)]));
  const all = [...boxes.values()];
  const bounds =
    chosen.length === 1
      ? { left: 0, right: 1, top: 0, bottom: 1 }
      : {
          left: Math.min(...all.map((b) => b.left)),
          right: Math.max(...all.map((b) => b.right)),
          top: Math.min(...all.map((b) => b.top)),
          bottom: Math.max(...all.map((b) => b.bottom)),
        };
  return layout.map((item, index) => {
    const box = boxes.get(index);
    if (!box) return item;
    switch (mode) {
      case "left":
        return shift(item, bounds.left - box.left, 0);
      case "right":
        return shift(item, bounds.right - box.right, 0);
      case "centerX":
        return shift(item, (bounds.left + bounds.right) / 2 - (box.left + box.right) / 2, 0);
      case "top":
        return shift(item, 0, bounds.top - box.top);
      case "bottom":
        return shift(item, 0, bounds.bottom - box.bottom);
      case "middleY":
        return shift(item, 0, (bounds.top + bounds.bottom) / 2 - (box.top + box.bottom) / 2);
    }
  });
}

/** Phân bố đều khoảng cách tâm giữa phần tử đầu và cuối (cần từ ba phần tử). */
export function distributeItems(layout: LayoutItem[], selection: number[], axis: DistributeAxis, boxOf: BoxOf = fallbackBox): LayoutItem[] {
  const chosen = selection.filter((i) => layout[i]);
  if (chosen.length < 3) return layout;
  const center = (i: number) => {
    const b = boxOf(layout[i], i);
    return axis === "x" ? (b.left + b.right) / 2 : (b.top + b.bottom) / 2;
  };
  const sorted = [...chosen].sort((a, b) => center(a) - center(b));
  const first = center(sorted[0]);
  const last = center(sorted[sorted.length - 1]);
  const step = (last - first) / (sorted.length - 1);
  const target = new Map(sorted.map((i, order) => [i, first + step * order]));
  return layout.map((item, index) => {
    const want = target.get(index);
    if (want === undefined) return item;
    const delta = want - center(index);
    return axis === "x" ? shift(item, delta, 0) : shift(item, 0, delta);
  });
}

/** Dịch các phần tử được chọn (phím mũi tên). */
export function nudgeItems(layout: LayoutItem[], selection: number[], dx: number, dy: number): LayoutItem[] {
  const set = new Set(selection);
  return layout.map((item, index) => (set.has(index) ? shift(item, dx, dy) : item));
}

/** Nhân bản: bản sao lệch một chút và nằm cuối danh sách. Trả về bố cục mới và chỉ số các bản sao. */
export function duplicateItems(layout: LayoutItem[], selection: number[], offset = 0.02): { layout: LayoutItem[]; created: number[] } {
  const copies = selection.filter((i) => layout[i]).map((i) => shift({ ...layout[i] }, offset, offset));
  const created = copies.map((_, n) => layout.length + n);
  return { layout: [...layout, ...copies], created };
}

export function removeItems(layout: LayoutItem[], selection: number[]): LayoutItem[] {
  const set = new Set(selection);
  return layout.filter((_, index) => !set.has(index));
}

/** Áp một phần cập nhật (kiểu chữ…) lên các phần tử được chọn. */
export function patchItems(layout: LayoutItem[], selection: number[], patch: Partial<LayoutItem>): LayoutItem[] {
  const set = new Set(selection);
  return layout.map((item, index) => (set.has(index) ? { ...item, ...patch } : item));
}
