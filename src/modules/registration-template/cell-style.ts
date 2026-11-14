import type { Cell } from "exceljs";

/**
 * Tách style của ô khỏi các ô khác trước khi đổi font / căn lề / màu / viền. exceljs dựng mọi ô cùng style trong file đã lưu thành CÙNG MỘT
 * đối tượng style (cache theo styleId), nên gán `cell.font = ...` lên một ô sẽ đổi luôn mọi ô dùng chung style đó.
 */
export function ownStyle(cell: Cell): Cell {
  cell.style = { ...cell.style };
  return cell;
}
