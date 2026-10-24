import { describe, expect, it } from "vitest";
import {
  badgePayload,
  blankBadgeForm,
  cardAspect,
  formFromBadgeConfig,
  gridOfForm,
  isSameBadgeForm,
  sampleBadgeValue,
  validateBadgeForm,
  type BadgeConfig,
  type BadgeForm,
} from "@/modules/badges/badge-design";
import type { LayoutItem } from "@/modules/certificates/components/certificate-design";

function item(overrides: Partial<LayoutItem> = {}): LayoutItem {
  return { type: "FIELD", fieldKey: "holyName", x: 0.5, y: 0.5, fontSize: 0.1, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false, ...overrides };
}

function form(overrides: Partial<BadgeForm> = {}): BadgeForm {
  return { ...blankBadgeForm(), name: "Thẻ", ...overrides };
}

describe("blankBadgeForm", () => {
  it("defaults to a 90x55 landscape card on A4 portrait, single sided", () => {
    const blank = blankBadgeForm();
    expect(blank).toMatchObject({ paperSize: "A4", paperOrientation: "PORTRAIT", cardWidthMm: 90, cardHeightMm: 55, cardOrientation: "LANDSCAPE", marginMm: 10, gapMm: 0, cropMarks: true, hasBack: false });
    expect(gridOfForm(blank)?.perPage).toBe(10);
  });
});

describe("formFromBadgeConfig", () => {
  const config: BadgeConfig = {
    id: "1",
    name: "Thẻ đội",
    isDefault: true,
    scopeLevel: "DEANERY",
    editable: true,
    paperSize: "A5",
    paperOrientation: "LANDSCAPE",
    cardWidthMm: 60,
    cardHeightMm: 40,
    cardOrientation: "PORTRAIT",
    marginMm: 5,
    gapMm: 2,
    cropMarks: false,
    hasBack: true,
    frontBackground: "data:image/png;base64,AA",
    backBackground: null,
    frontLayout: [{ type: "FIELD", fieldKey: "teamName" } as LayoutItem],
    backLayout: [],
  };

  it("maps every saved property and normalises layout items", () => {
    const loaded = formFromBadgeConfig(config);
    expect(loaded).toMatchObject({ name: "Thẻ đội", paperSize: "A5", paperOrientation: "LANDSCAPE", cardOrientation: "PORTRAIT", cropMarks: false, hasBack: true, backBackground: "" });
    expect(loaded.frontLayout[0]).toMatchObject({ type: "FIELD", fieldKey: "teamName", x: 0.5, y: 0.5, align: "center", fontFamily: "sans", bold: false });
  });

  it("fills defaults for summaries that carry no layout", () => {
    const loaded = formFromBadgeConfig({ id: "2", name: "Gọn", isDefault: false, scopeLevel: "SYSTEM", editable: false });
    expect(loaded.frontLayout).toEqual([]);
    expect(loaded.cardWidthMm).toBe(90);
    expect(loaded.cropMarks).toBe(true);
    expect(loaded.hasBack).toBe(false);
  });

  it("round-trips through the payload", () => {
    const loaded = formFromBadgeConfig(config);
    const payload = badgePayload(loaded);
    expect(payload).toMatchObject({ name: "Thẻ đội", paperSize: "A5", cardWidthMm: 60, cardHeightMm: 40, cardOrientation: "PORTRAIT", hasBack: true });
    expect(payload.frontBackground).toBe("data:image/png;base64,AA");
    expect(payload.backBackground).toBeNull();
  });
});

describe("isSameBadgeForm", () => {
  it("detects any change", () => {
    const base = form();
    expect(isSameBadgeForm(base, form())).toBe(true);
    expect(isSameBadgeForm(base, form({ name: "Khác" }))).toBe(false);
    expect(isSameBadgeForm(base, form({ frontLayout: [item()] }))).toBe(false);
    expect(isSameBadgeForm(form({ frontLayout: [item()] }), form({ frontLayout: [item({ x: 0.6 })] }))).toBe(false);
  });
});

describe("badgePayload", () => {
  it("trims the name and nulls empty backgrounds", () => {
    const payload = badgePayload(form({ name: "  Thẻ  " }));
    expect(payload.name).toBe("Thẻ");
    expect(payload.frontBackground).toBeNull();
  });

  it("drops the back side when the card has no back", () => {
    const payload = badgePayload(form({ hasBack: false, backBackground: "data:image/png;base64,BB", backLayout: [item()] }));
    expect(payload.hasBack).toBe(false);
    expect(payload.backBackground).toBeNull();
    expect(payload.backLayout).toEqual([]);
  });

  it("keeps the back side when the card has a back", () => {
    const payload = badgePayload(form({ hasBack: true, backBackground: "data:image/png;base64,BB", backLayout: [item({ type: "QR", size: 0.3 })] }));
    expect(payload.backBackground).toBe("data:image/png;base64,BB");
    expect(payload.backLayout).toHaveLength(1);
  });
});

describe("cardAspect", () => {
  it("applies the card orientation", () => {
    expect(cardAspect({ cardWidthMm: 90, cardHeightMm: 55, cardOrientation: "LANDSCAPE" })).toBeCloseTo(90 / 55);
    expect(cardAspect({ cardWidthMm: 90, cardHeightMm: 55, cardOrientation: "PORTRAIT" })).toBeCloseTo(55 / 90);
    expect(cardAspect({ cardWidthMm: 55, cardHeightMm: 90, cardOrientation: "LANDSCAPE" })).toBeCloseTo(90 / 55);
  });
});

describe("validateBadgeForm", () => {
  it("accepts the default form", () => {
    expect(validateBadgeForm(form())).toEqual([]);
  });

  it("rejects out-of-range card sizes, margins and gaps", () => {
    expect(validateBadgeForm(form({ cardWidthMm: 19 })).join(" ")).toContain("Chiều rộng thẻ");
    expect(validateBadgeForm(form({ cardWidthMm: 401 })).join(" ")).toContain("Chiều rộng thẻ");
    expect(validateBadgeForm(form({ cardHeightMm: 0 })).join(" ")).toContain("Chiều cao thẻ");
    expect(validateBadgeForm(form({ cardHeightMm: Number.NaN })).join(" ")).toContain("Chiều cao thẻ");
    expect(validateBadgeForm(form({ marginMm: -1 })).join(" ")).toContain("Lề giấy");
    expect(validateBadgeForm(form({ marginMm: 51 })).join(" ")).toContain("Lề giấy");
    expect(validateBadgeForm(form({ gapMm: 31 })).join(" ")).toContain("Khoảng cách");
  });

  it("accepts the boundary values", () => {
    expect(validateBadgeForm(form({ cardWidthMm: 20, cardHeightMm: 20, marginMm: 0, gapMm: 30 }))).toEqual([]);
  });

  it("rejects an unknown paper size", () => {
    expect(validateBadgeForm(form({ paperSize: "B7" })).join(" ")).toContain("Khổ giấy");
  });

  it("explains when the card does not fit the paper", () => {
    const errors = validateBadgeForm(form({ paperSize: "A5", cardWidthMm: 200, cardHeightMm: 100 }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("lớn hơn vùng in");
    expect(errors[0]).toContain("A5");
  });

  it("does not stack a fit error on top of range errors", () => {
    expect(validateBadgeForm(form({ cardWidthMm: 1000 }))).toHaveLength(1);
  });

  it("limits the name length and layout size", () => {
    expect(validateBadgeForm(form({ name: "x".repeat(201) })).join(" ")).toContain("Tên tối đa");
    expect(validateBadgeForm(form({ frontLayout: Array.from({ length: 101 }, () => item()) })).join(" ")).toContain("Mặt trước tối đa");
    expect(validateBadgeForm(form({ hasBack: true, backLayout: Array.from({ length: 101 }, () => item()) })).join(" ")).toContain("Mặt sau tối đa");
    expect(validateBadgeForm(form({ hasBack: false, backLayout: Array.from({ length: 101 }, () => item()) }))).toEqual([]);
  });
});

describe("sampleBadgeValue", () => {
  it("has a sample for every badge field and falls back for unknown ones", () => {
    for (const key of ["holyName", "leaderName", "leaderFullName", "leaderParishName", "leaderDeaneryName", "leaderDioceseName", "teamName", "courseName", "courseCode", "hostYear", "courseStartDate", "courseEndDate", "coursePeriod", "courseLocation"]) {
      expect(sampleBadgeValue(key, "FALLBACK"), key).not.toBe("FALLBACK");
    }
    expect(sampleBadgeValue("unknown", "FALLBACK")).toBe("FALLBACK");
    expect(sampleBadgeValue(undefined, "FALLBACK")).toBe("FALLBACK");
  });
});
