import { describe, expect, it } from "vitest";
import { buildRows, moveItem, moveRow, sameOrder, sameRows, tierNumbers, toggleLinked, toTiers, type LevelRow } from "@/modules/leader-levels/reorder";

const rows = (...items: Array<[string, boolean]>): LevelRow[] => items.map(([code, linked]) => ({ code, linked }));

describe("leader level reorder", () => {
  it("di chuyển một phần tử xuống và lên", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("giữ nguyên khi vị trí không đổi hoặc chỉ số sai", () => {
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });

  it("so sánh hai thứ tự", () => {
    expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameOrder(["a", "b"], ["b", "a"])).toBe(false);
  });
});

describe("leader level tiers (cấp bằng nhau)", () => {
  it("dựng dòng từ displayOrder: cùng số là bằng cấp", () => {
    const built = buildRows([
      { levelCode: "DU_TRUONG", displayOrder: 1 },
      { levelCode: "HT_I", displayOrder: 2 },
      { levelCode: "HT_I_B", displayOrder: 2 },
      { levelCode: "HT_II", displayOrder: 3 },
    ]);
    expect(built).toEqual(rows(["DU_TRUONG", false], ["HT_I", false], ["HT_I_B", true], ["HT_II", false]));
    expect(toTiers(built)).toEqual([["DU_TRUONG"], ["HT_I", "HT_I_B"], ["HT_II"]]);
    expect(tierNumbers(built)).toEqual([1, 2, 2, 3]);
  });

  it("nối / tách quan hệ bằng cấp với dòng phía trên", () => {
    const start = rows(["A", false], ["B", false], ["C", false]);
    const linked = toggleLinked(start, 1);
    expect(toTiers(linked)).toEqual([["A", "B"], ["C"]]);
    expect(toTiers(toggleLinked(linked, 1))).toEqual([["A"], ["B"], ["C"]]);
  });

  it("dòng đầu tiên không nối được lên trên", () => {
    const start = rows(["A", false], ["B", false]);
    expect(toggleLinked(start, 0)).toEqual(start);
  });

  it("kéo một dòng thành bậc riêng và không nối nhầm các dòng còn lại", () => {
    // A < (B = C) < D ; kéo D lên trước B: D < B = C ... D thành bậc riêng, B, C vẫn bằng cấp nhau.
    const start = rows(["A", false], ["B", false], ["C", true], ["D", false]);
    const moved = moveRow(start, 3, 1);
    expect(moved.map((row) => row.code)).toEqual(["A", "D", "B", "C"]);
    expect(toTiers(moved)).toEqual([["A"], ["D"], ["B", "C"]]);
  });

  it("lấy đầu bậc đi thì dòng bằng cấp kế sau trở thành đầu bậc mới", () => {
    // A < (B = C) < D ; kéo B xuống cuối: C trở thành bậc riêng thay vì nối vào A.
    const start = rows(["A", false], ["B", false], ["C", true], ["D", false]);
    const moved = moveRow(start, 1, 3);
    expect(moved.map((row) => row.code)).toEqual(["A", "C", "D", "B"]);
    expect(toTiers(moved)).toEqual([["A"], ["C"], ["D"], ["B"]]);
  });

  it("kéo dòng lên đầu danh sách thì không bị đánh dấu bằng cấp", () => {
    const start = rows(["A", false], ["B", false], ["C", true]);
    const moved = moveRow(start, 2, 0);
    expect(moved[0].linked).toBe(false);
    expect(toTiers(moved)).toEqual([["C"], ["A"], ["B"]]);
  });

  it("so sánh hai bố cục dòng", () => {
    expect(sameRows(rows(["A", false], ["B", true]), rows(["A", false], ["B", true]))).toBe(true);
    expect(sameRows(rows(["A", false], ["B", true]), rows(["A", false], ["B", false]))).toBe(false);
  });
});
