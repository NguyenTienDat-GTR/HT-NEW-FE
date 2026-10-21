import { describe, expect, it } from "vitest";
import { moveCodeTo, moveItem, sameOrder } from "@/modules/leader-levels/reorder";

describe("leader level reorder", () => {
  it("di chuyển một phần tử xuống và lên", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("giữ nguyên khi vị trí không đổi hoặc chỉ số sai", () => {
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });

  it("kẹp vị trí đích trong phạm vi", () => {
    expect(moveItem(["a", "b", "c"], 0, 99)).toEqual(["b", "c", "a"]);
  });

  it("thả một mã vào vị trí của mã khác theo mã", () => {
    expect(moveCodeTo(["HT_I", "HT_II", "HT_III"], "HT_III", "HT_I")).toEqual(["HT_III", "HT_I", "HT_II"]);
    expect(moveCodeTo(["HT_I", "HT_II"], "KHONG_CO", "HT_I")).toEqual(["HT_I", "HT_II"]);
  });

  it("so sánh hai thứ tự", () => {
    expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameOrder(["a", "b"], ["b", "a"])).toBe(false);
  });
});
