import { describe, expect, it } from "vitest";
import type { LayoutItem } from "@/modules/certificates/components/certificate-design";
import { alignItems, distributeItems, duplicateItems, nudgeItems, patchItems, removeItems } from "@/modules/layout-config/wysiwyg/layout-ops";
import { ptToRatio, ratioToPt, stepFontPt } from "@/modules/layout-config/wysiwyg/font-size";

const base: LayoutItem = { type: "TEXT", text: "a", x: 0.5, y: 0.5, fontSize: 0.04, color: "#000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false };
const at = (x: number, y: number): LayoutItem => ({ ...base, x, y });

describe("font size", () => {
  it("converts between pt and page-height ratio", () => {
    // A4 ngang cao 210mm: 12pt ≈ 4.233mm ≈ 0.02016 chiều cao trang.
    expect(ptToRatio(12, 210)).toBeCloseTo(0.02016, 4);
    expect(ratioToPt(ptToRatio(18, 210), 210)).toBeCloseTo(18, 0);
  });
  it("clamps the ratio", () => {
    expect(ptToRatio(1000, 210)).toBe(0.3);
    expect(ptToRatio(0.01, 210)).toBe(0.005);
  });
  it("steps through presets like Word", () => {
    expect(stepFontPt(12, 1)).toBe(14);
    expect(stepFontPt(12, -1)).toBe(11);
    expect(stepFontPt(72, 1)).toBe(76);
    expect(stepFontPt(8, -1)).toBe(7);
  });
});

describe("layout ops", () => {
  const layout = [at(0.2, 0.2), at(0.5, 0.6), at(0.9, 0.4)];

  it("aligns a single item to the page", () => {
    expect(alignItems(layout, [0], "centerX")[0].x).toBe(0.5);
    expect(alignItems(layout, [0], "right")[0].x).toBe(1);
    expect(alignItems(layout, [0], "top")[0].y).toBe(0);
  });
  it("aligns a group to its own bounds", () => {
    for (const item of alignItems(layout, [0, 1, 2], "left")) expect(item.x).toBeCloseTo(0.2, 10);
    for (const item of alignItems(layout, [0, 1, 2], "middleY")) expect(item.y).toBeCloseTo(0.4, 10);
  });
  it("leaves unselected items alone", () => {
    expect(alignItems(layout, [0, 1], "left")[2]).toBe(layout[2]);
  });
  it("distributes evenly and needs three items", () => {
    const spread = distributeItems([at(0, 0.5), at(0.2, 0.5), at(1, 0.5)], [0, 1, 2], "x");
    spread.forEach((item, n) => expect(item.x).toBeCloseTo([0, 0.5, 1][n], 10));
    expect(distributeItems(layout, [0, 1], "x")).toBe(layout);
  });
  it("nudges, duplicates, removes and patches", () => {
    expect(nudgeItems(layout, [1], 0.1, 0)[1].x).toBeCloseTo(0.6);
    expect(nudgeItems(layout, [1], 2, 0)[1].x).toBe(1);
    const dup = duplicateItems(layout, [0, 2]);
    expect(dup.layout).toHaveLength(5);
    expect(dup.created).toEqual([3, 4]);
    expect(removeItems(layout, [0, 2])).toEqual([layout[1]]);
    expect(patchItems(layout, [1], { bold: true }).map((i) => i.bold)).toEqual([false, true, false]);
  });
});
