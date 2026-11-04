// Cỡ chữ lưu theo tỉ lệ chiều cao trang (BE đổi ra pt theo chiều cao trang thật); trình soạn cho nhập theo pt như Word.
const PT_PER_MM = 72 / 25.4;

export const FONT_SIZE_PRESETS_PT = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72] as const;
export const MIN_FONT_RATIO = 0.005;
export const MAX_FONT_RATIO = 0.3;

export function ratioToPt(ratio: number, pageHeightMm: number): number {
  return Math.round(ratio * pageHeightMm * PT_PER_MM * 10) / 10;
}

export function ptToRatio(pt: number, pageHeightMm: number): number {
  const ratio = pt / (pageHeightMm * PT_PER_MM);
  return Math.min(MAX_FONT_RATIO, Math.max(MIN_FONT_RATIO, ratio));
}

/** Nút A+ / A−: nhảy sang bậc cỡ chữ kế tiếp trong danh sách cỡ có sẵn (như Word). */
export function stepFontPt(currentPt: number, direction: 1 | -1): number {
  const presets = FONT_SIZE_PRESETS_PT;
  if (direction === 1) return presets.find((p) => p > currentPt + 0.05) ?? Math.round(currentPt) + 4;
  const lower = [...presets].reverse().find((p) => p < currentPt - 0.05);
  return lower ?? Math.max(1, Math.round(currentPt) - 1);
}
