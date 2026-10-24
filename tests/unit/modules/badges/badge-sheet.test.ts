import { describe, expect, it } from "vitest";
import {
  CARD_PRESETS,
  cardPosition,
  computeGrid,
  formatMm,
  isKnownPaper,
  mirrorColumnsFor,
  orientCard,
  pageCount,
  paperMm,
} from "@/modules/badges/badge-sheet";

describe("paperMm", () => {
  it("returns portrait and landscape dimensions", () => {
    expect(paperMm("A4", "PORTRAIT")).toEqual([210, 297]);
    expect(paperMm("A4", "LANDSCAPE")).toEqual([297, 210]);
    expect(paperMm("a3", "PORTRAIT")).toEqual([297, 420]);
    expect(paperMm("LEGAL", "LANDSCAPE")).toEqual([355.6, 215.9]);
  });

  it("falls back to A4 portrait for unknown or missing input", () => {
    expect(paperMm("B7", "PORTRAIT")).toEqual([210, 297]);
    expect(paperMm(undefined, undefined)).toEqual([210, 297]);
  });

  it("recognises supported paper names only", () => {
    expect(isKnownPaper(" a4 ")).toBe(true);
    expect(isKnownPaper("LETTER")).toBe(true);
    expect(isKnownPaper("B7")).toBe(false);
    expect(isKnownPaper(undefined)).toBe(false);
  });
});

describe("orientCard", () => {
  it("puts the long side horizontally for landscape", () => {
    expect(orientCard(55, 90, "LANDSCAPE")).toEqual({ widthMm: 90, heightMm: 55 });
    expect(orientCard(90, 55, "LANDSCAPE")).toEqual({ widthMm: 90, heightMm: 55 });
  });

  it("puts the long side vertically for portrait", () => {
    expect(orientCard(90, 55, "PORTRAIT")).toEqual({ widthMm: 55, heightMm: 90 });
  });

  it("keeps square cards square", () => {
    expect(orientCard(60, 60, "PORTRAIT")).toEqual({ widthMm: 60, heightMm: 60 });
  });
});

describe("computeGrid", () => {
  it("fits ten 90x55 cards on A4 with 10mm margin", () => {
    const grid = computeGrid(210, 297, 90, 55, 10, 0);
    expect(grid).toMatchObject({ columns: 2, rows: 5, perPage: 10 });
  });

  it("centres the grid inside the printable area", () => {
    const grid = computeGrid(210, 297, 90, 55, 10, 0)!;
    expect(grid.originXMm).toBeCloseTo(15);
    expect(grid.originYMm).toBeCloseTo(11);
  });

  it("gap reduces the number of columns", () => {
    expect(computeGrid(210, 297, 90, 55, 10, 0)!.columns).toBe(2);
    expect(computeGrid(210, 297, 90, 55, 10, 11)!.columns).toBe(1);
    expect(computeGrid(210, 297, 90, 55, 10, 10)!.columns).toBe(2);
  });

  it("accepts a card that exactly fills the printable area", () => {
    const grid = computeGrid(210, 297, 190, 277, 10, 0)!;
    expect(grid.perPage).toBe(1);
    expect(grid.originXMm).toBeCloseTo(10);
  });

  it("is not thrown off by floating point noise", () => {
    expect(computeGrid(210, 297, 190 / 3, 55, 10, 0)!.columns).toBe(3);
  });

  it("returns null when not even one card fits", () => {
    expect(computeGrid(210, 297, 191, 55, 10, 0)).toBeNull();
    expect(computeGrid(210, 297, 90, 278, 10, 0)).toBeNull();
    expect(computeGrid(210, 297, 90, 55, 105, 0)).toBeNull();
    expect(computeGrid(210, 297, 0, 55, 10, 0)).toBeNull();
    expect(computeGrid(210, 297, 90, -1, 10, 0)).toBeNull();
    expect(computeGrid(210, 297, Number.NaN, 55, 10, 0)).toBeNull();
  });

  it("uses the whole page with zero margin", () => {
    expect(computeGrid(210, 297, 105, 148.5, 0, 0)).toMatchObject({ columns: 2, rows: 2, originXMm: 0, originYMm: 0 });
  });

  it("matches the documented preset capacities on A4 portrait", () => {
    const perPage = (id: string) => {
      const preset = CARD_PRESETS.find((item) => item.id === id)!;
      return computeGrid(210, 297, preset.widthMm, preset.heightMm, 10, 0)?.perPage;
    };
    expect(perPage("badge-90x55")).toBe(10);
    expect(perPage("badge-85x54")).toBe(10);
    expect(perPage("badge-210x148")).toBeUndefined();
    expect(computeGrid(210, 297, 210, 148, 0, 0)!.perPage).toBe(2);
  });

  it("every preset fits at least one card on A3 with default margin", () => {
    for (const preset of CARD_PRESETS) {
      expect(computeGrid(297, 420, preset.widthMm, preset.heightMm, 10, 0), preset.id).not.toBeNull();
    }
  });
});

describe("cardPosition", () => {
  const grid = computeGrid(210, 297, 90, 55, 10, 0)!;

  it("walks the grid row by row from the top-left", () => {
    expect(cardPosition(grid, 0)).toEqual([15, 11]);
    expect(cardPosition(grid, 1)).toEqual([105, 11]);
    expect(cardPosition(grid, 2)).toEqual([15, 66]);
    expect(cardPosition(grid, 9)).toEqual([105, 231]);
  });

  it("mirrors columns for the back side", () => {
    expect(cardPosition(grid, 0, true)).toEqual(cardPosition(grid, 1));
    expect(cardPosition(grid, 3, true)).toEqual(cardPosition(grid, 2));
  });

  it("mirrors rows for the back side", () => {
    expect(cardPosition(grid, 0, false, true)).toEqual(cardPosition(grid, 8));
    expect(cardPosition(grid, 1, false, true)).toEqual(cardPosition(grid, 9));
  });

  it("mirroring twice (columns and rows) is a 180 degree turn", () => {
    expect(cardPosition(grid, 0, true, true)).toEqual(cardPosition(grid, 9));
  });
});

describe("mirrorColumnsFor", () => {
  it("long edge flip on portrait paper mirrors columns", () => {
    expect(mirrorColumnsFor(210, 297, "LONG")).toBe(true);
    expect(mirrorColumnsFor(210, 297, "SHORT")).toBe(false);
  });

  it("long edge flip on landscape paper mirrors rows", () => {
    expect(mirrorColumnsFor(297, 210, "LONG")).toBe(false);
    expect(mirrorColumnsFor(297, 210, "SHORT")).toBe(true);
  });
});

describe("pageCount", () => {
  const grid = computeGrid(210, 297, 90, 55, 10, 0);

  it("counts sheets, doubling them for two-sided printing", () => {
    expect(pageCount(25, grid, false)).toBe(3);
    expect(pageCount(25, grid, true)).toBe(6);
    expect(pageCount(10, grid, true)).toBe(2);
    expect(pageCount(11, grid, false)).toBe(2);
  });

  it("is zero without participants or without a usable grid", () => {
    expect(pageCount(0, grid, true)).toBe(0);
    expect(pageCount(-3, grid, false)).toBe(0);
    expect(pageCount(5, null, false)).toBe(0);
  });
});

describe("formatMm", () => {
  it("prints whole numbers plainly and decimals with a comma", () => {
    expect(formatMm(90)).toBe("90");
    expect(formatMm(85.6)).toBe("85,6");
    expect(formatMm(74.25)).toBe("74,25");
    expect(formatMm(54.004)).toBe("54");
  });
});
