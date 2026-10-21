// Một dòng trong thang cấp độ khi chỉnh sửa. `linked` = dòng này bằng cấp với dòng ngay phía trên (cùng bậc).
export type LevelRow = { code: string; linked: boolean };

// Chuyển phần tử ở vị trí `from` sang vị trí `to` (chỉ số trong mảng kết quả), trả về mảng mới.
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return [...list];
  const target = Math.max(0, Math.min(to, list.length - 1));
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

export function sameOrder(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((code, index) => code === right[index]);
}

// Dựng các dòng từ danh sách cấp (đã sắp theo bậc tăng dần, không gồm cấp hệ thống): cùng displayOrder thì bằng cấp.
export function buildRows(levels: readonly { levelCode: string; displayOrder: number }[]): LevelRow[] {
  return levels.map((level, index) => ({ code: level.levelCode, linked: index > 0 && levels[index - 1].displayOrder === level.displayOrder }));
}

// Dòng đầu tiên không thể bằng cấp với dòng nào phía trên; chuẩn hóa để dữ liệu luôn hợp lệ.
function normalized(rows: LevelRow[]): LevelRow[] {
  return rows.map((row, index) => (index === 0 && row.linked ? { ...row, linked: false } : row));
}

// Kéo dòng ở vị trí `from` tới vị trí `to`. Dòng được kéo thành một bậc riêng (không còn bằng cấp với ai);
// các dòng còn lại giữ nguyên quan hệ bằng cấp, trừ chỗ bị tách ra hoặc bị chèn vào giữa.
export function moveRow(rows: readonly LevelRow[], from: number, to: number): LevelRow[] {
  if (from === to || from < 0 || from >= rows.length) return [...rows];
  const next = rows.map((row) => ({ ...row }));
  const moved = next[from];
  // Dòng kế sau từng bằng cấp với dòng bị lấy đi thì trở thành đầu bậc mới, không nối nhầm vào dòng phía trên.
  if (!moved.linked && next[from + 1]?.linked) next[from + 1].linked = false;
  next.splice(from, 1);
  const target = Math.max(0, Math.min(to, next.length));
  moved.linked = false;
  next.splice(target, 0, moved);
  // Dòng ngay sau vị trí chèn không còn bằng cấp với dòng phía trên cũ của nó.
  if (next[target + 1]) next[target + 1].linked = false;
  return normalized(next);
}

// Đổi quan hệ bằng cấp giữa dòng `index` và dòng ngay phía trên nó.
export function toggleLinked(rows: readonly LevelRow[], index: number): LevelRow[] {
  if (index <= 0 || index >= rows.length) return [...rows];
  return normalized(rows.map((row, position) => (position === index ? { ...row, linked: !row.linked } : row)));
}

// Gộp các dòng liên tiếp bằng cấp nhau thành từng bậc, từ thấp đến cao (đúng dạng BE nhận).
export function toTiers(rows: readonly LevelRow[]): string[][] {
  const tiers: string[][] = [];
  rows.forEach((row, index) => {
    if (index > 0 && row.linked) tiers[tiers.length - 1].push(row.code);
    else tiers.push([row.code]);
  });
  return tiers;
}

export function sameRows(left: readonly LevelRow[], right: readonly LevelRow[]) {
  return left.length === right.length && left.every((row, index) => row.code === right[index].code && row.linked === right[index].linked);
}

// Số bậc (1..n) của từng dòng trong danh sách đã gộp.
export function tierNumbers(rows: readonly LevelRow[]): number[] {
  let tier = 0;
  return rows.map((row, index) => {
    if (index === 0 || !row.linked) tier += 1;
    return tier;
  });
}
