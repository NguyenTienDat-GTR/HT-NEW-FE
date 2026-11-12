import { describe, expect, it } from "vitest";
import { isInvalidScore, originalScore, runWithConcurrency, sameScore, scoreColumnLabel, scoreColumnWidthClass, scoreComponentCaption } from "@/components/common/resource/score-entry";

describe("score table layout helpers", () => {
  it("shortens the parish header to just Giáo xứ and leaves other labels alone", () => {
    expect(scoreColumnLabel("parishName", "Giáo xứ / giáo họ / giáo điểm")).toBe("Giáo xứ");
    expect(scoreColumnLabel("leaderParishName", "Giáo xứ / giáo họ / giáo điểm")).toBe("Giáo xứ");
    expect(scoreColumnLabel("deaneryName", "Giáo hạt")).toBe("Giáo hạt");
  });

  it("gives every column a minimum width so long text wraps instead of crushing the column", () => {
    expect(scoreColumnWidthClass("leaderFullName")).toContain("min-w-");
    expect(scoreColumnWidthClass("parishName")).toContain("min-w-");
    // Cột lạ vẫn có độ rộng tối thiểu mặc định.
    expect(scoreColumnWidthClass("somethingElse")).toBe("min-w-24");
    // Nhãn kết quả không xuống dòng.
    expect(scoreColumnWidthClass("finalResult")).toContain("whitespace-nowrap");
  });

  it("writes the score column caption with max score and coefficient or exclusion", () => {
    expect(scoreComponentCaption({ id: "a", name: "A", maxScore: "10", coefficient: 2 })).toBe("Tối đa 10 · hệ số 2");
    expect(scoreComponentCaption({ id: "a", name: "A", maxScore: 10 })).toBe("Tối đa 10 · hệ số 1");
    expect(scoreComponentCaption({ id: "a", name: "A", maxScore: 10, includeInFinal: false })).toBe("Tối đa 10 · không tính tổng");
  });
});

describe("score entry helpers", () => {
  it("reads the saved score of a component from the row", () => {
    const row = { componentScores: [{ componentId: "a", score: 8.5 }] };

    expect(originalScore(row, "a")).toBe("8.5");
    expect(originalScore(row, "b")).toBe("");
  });

  it("treats numerically equal scores as unchanged", () => {
    expect(sameScore("8", "8.0")).toBe(true);
    expect(sameScore("", "")).toBe(true);
    expect(sameScore("7", "")).toBe(false);
  });

  it("flags scores outside 0..max", () => {
    const component = { id: "a", name: "Kỹ năng", maxScore: 10 };

    expect(isInvalidScore(component, "10")).toBe(false);
    expect(isInvalidScore(component, "10.5")).toBe(true);
    expect(isInvalidScore(component, "-1")).toBe(true);
    expect(isInvalidScore(component, "")).toBe(false);
  });

  it("runs jobs in parallel without exceeding the limit and keeps result order", async () => {
    let running = 0;
    let peak = 0;
    const results = await runWithConcurrency([1, 2, 3, 4, 5, 6], 3, async (item) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      if (item === 4) throw new Error("boom");
      return item * 2;
    });

    expect(peak).toBeLessThanOrEqual(3);
    expect(results.map((result) => (result.status === "fulfilled" ? result.value : "failed"))).toEqual([2, 4, 6, "failed", 10, 12]);
  });
});
