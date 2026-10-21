// Chuyển phần tử ở vị trí `from` sang vị trí `to` (chỉ số trong mảng kết quả), trả về mảng mới.
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return [...list];
  const target = Math.max(0, Math.min(to, list.length - 1));
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

// Đặt mã `code` vào đúng vị trí hiện tại của mã `beforeCode` (thả lên trên dòng đó); bỏ qua nếu không tìm thấy.
export function moveCodeTo(order: readonly string[], code: string, beforeCode: string): string[] {
  const from = order.indexOf(code);
  const to = order.indexOf(beforeCode);
  if (from < 0 || to < 0) return [...order];
  return moveItem(order, from, to);
}

export function sameOrder(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((code, index) => code === right[index]);
}
