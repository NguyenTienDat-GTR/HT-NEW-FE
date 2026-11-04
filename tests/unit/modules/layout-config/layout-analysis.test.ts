import { describe, expect, it } from "vitest";
import type { LayoutItem } from "@/modules/certificates/components/certificate-design";
import { analyzeLayout } from "@/modules/layout-config/wysiwyg/layout-analysis";
import { applyStyle, mirrorLayout, reorderItems, selectAllIndexes, styleOf } from "@/modules/layout-config/wysiwyg/layout-ops";
import { BADGE_TEMPLATES, CERTIFICATE_TEMPLATES } from "@/modules/layout-config/wysiwyg/layout-templates";

const base: LayoutItem = { type: "TEXT", text: "Xin chào", x: 0.5, y: 0.5, fontSize: 0.04, color: "#000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false };
const at = (patch: Partial<LayoutItem>): LayoutItem => ({ ...base, ...patch });

// A4 ngang: 297 × 210mm.
const ctx = (layout: LayoutItem[], extra: Record<string, unknown> = {}) => ({
  layout,
  pageWidthMm: 297,
  pageHeightMm: 210,
  textOf: (item: LayoutItem) => (item.type === "TEXT" ? (item.text ?? "") : (item.fieldKey ?? "")),
  ...extra,
});

describe("analyzeLayout", () => {
  it("reports nothing for a tidy layout", () => {
    expect(analyzeLayout(ctx([at({ y: 0.3 }), at({ y: 0.6 })]))).toEqual([]);
  });

  it("warns about text smaller than 6pt", () => {
    // 0.01 × 210mm ≈ 5.95pt
    const result = analyzeLayout(ctx([at({ fontSize: 0.01 })]));
    expect(result.map((w) => w.id)).toContain("small-0");
  });

  it("warns about a QR code that is too small to scan", () => {
    // 0.05 × 210mm = 10.5mm < 15mm
    const result = analyzeLayout(ctx([at({ type: "QR", size: 0.05 })]));
    expect(result.find((w) => w.id === "qr-0")?.message).toMatch(/11mm|10mm|QR/);
  });

  it("flags items that run off the page as errors and sorts them first", () => {
    const result = analyzeLayout(ctx([at({ fontSize: 0.01, y: 0.3 }), at({ x: 0.98, align: "left", text: "Một dòng rất dài chạy ra ngoài" })]));
    expect(result[0]).toMatchObject({ id: "out-1", level: "error", indexes: [1] });
  });

  it("flags items inside the unsafe margin", () => {
    const result = analyzeLayout(ctx([at({ x: 0.5, y: 0.01, fontSize: 0.02, text: "Sát mép" })], { safeMm: 5 }));
    expect(result.some((w) => w.id === "safe-0" || w.id === "out-0")).toBe(true);
  });

  it("reports overlapping items once per pair", () => {
    const result = analyzeLayout(ctx([at({}), at({ y: 0.505 })]));
    expect(result.filter((w) => w.id.startsWith("overlap"))).toHaveLength(1);
  });

  it("ignores hidden items", () => {
    expect(analyzeLayout(ctx([at({}), at({ hidden: true })]))).toEqual([]);
  });

  it("notes a field used more than once", () => {
    const result = analyzeLayout(ctx([at({ type: "FIELD", fieldKey: "courseName", y: 0.3 }), at({ type: "FIELD", fieldKey: "courseName", y: 0.7 })]));
    expect(result.find((w) => w.id === "dup-courseName")?.indexes).toEqual([0, 1]);
  });

  it("warns when the background would print under 150 dpi", () => {
    // 297mm = 11.69in; 1000px ≈ 86dpi
    const low = analyzeLayout(ctx([], { background: { naturalWidth: 1000, naturalHeight: 700 } }));
    expect(low.some((w) => w.id === "bg-dpi")).toBe(true);
    const fine = analyzeLayout(ctx([], { background: { naturalWidth: 3508, naturalHeight: 2480 } }));
    expect(fine).toEqual([]);
  });
});

describe("layout helpers", () => {
  const items = [at({ text: "A", x: 0.2, align: "left" }), at({ text: "B", x: 0.5 }), at({ text: "C", x: 0.9, align: "right" })];

  it("mirrors horizontally and swaps left/right alignment", () => {
    const mirrored = mirrorLayout(items);
    expect(mirrored.map((i) => i.x)).toEqual([0.8, 0.5, 0.1]);
    expect(mirrored.map((i) => i.align)).toEqual(["right", "center", "left"]);
  });

  it("reorders to front and back, keeping the selection on the moved items", () => {
    const front = reorderItems(items, [0], "front");
    expect(front.layout.map((i) => i.text)).toEqual(["B", "C", "A"]);
    expect(front.selection).toEqual([2]);
    const back = reorderItems(items, [2], "back");
    expect(back.layout.map((i) => i.text)).toEqual(["C", "A", "B"]);
    expect(back.selection).toEqual([0]);
  });

  it("moves one step forward / backward", () => {
    const forward = reorderItems(items, [0], "forward");
    expect(forward.layout.map((i) => i.text)).toEqual(["B", "A", "C"]);
    expect(forward.selection).toEqual([1]);
    const backward = reorderItems(items, [2], "backward");
    expect(backward.layout.map((i) => i.text)).toEqual(["A", "C", "B"]);
    expect(reorderItems(items, [2], "forward").layout).toEqual(items);
  });

  it("copies a text style onto text items only", () => {
    const style = styleOf(at({ fontFamily: "lora", fontSize: 0.07, bold: true, color: "#f00" }));
    const withQr = [...items, at({ type: "QR", size: 0.2 })];
    const result = applyStyle(withQr, [0, 3], style);
    expect(result[0]).toMatchObject({ fontFamily: "lora", fontSize: 0.07, bold: true, color: "#f00" });
    expect(result[3]).toBe(withQr[3]);
    expect(result[1]).toBe(withQr[1]);
  });

  it("selects every visible item", () => {
    expect(selectAllIndexes([at({}), at({ hidden: true }), at({})])).toEqual([0, 2]);
  });
});

describe("templates", () => {
  it("only use known item types and in-range coordinates", () => {
    for (const template of [...CERTIFICATE_TEMPLATES, ...BADGE_TEMPLATES]) {
      expect(template.items.length).toBeGreaterThan(0);
      for (const item of template.items) {
        expect(["FIELD", "TEXT", "QR", "PHOTO"]).toContain(item.type);
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.x).toBeLessThanOrEqual(1);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeLessThanOrEqual(1);
        if (item.type === "FIELD") expect(item.fieldKey).toBeTruthy();
      }
    }
  });
});
