import { describe, expect, it } from "vitest";
import { DEFAULT_SCAN_COOLDOWN_MS, markScanned, shouldProcessScan } from "@/modules/course-participants/scan-gate";

describe("scan gate", () => {
  it("processes the very first scan", () => {
    expect(shouldProcessScan("HTATT1.a.b", 1000, null)).toBe(true);
  });

  it("ignores the same code inside the cooldown", () => {
    const last = markScanned("HTATT1.a.b", 1000);
    expect(shouldProcessScan("HTATT1.a.b", 1000 + DEFAULT_SCAN_COOLDOWN_MS - 1, last)).toBe(false);
    expect(shouldProcessScan("HTATT1.a.b", 1000, last)).toBe(false);
  });

  it("processes the same code again after the cooldown", () => {
    const last = markScanned("HTATT1.a.b", 1000);
    expect(shouldProcessScan("HTATT1.a.b", 1000 + DEFAULT_SCAN_COOLDOWN_MS, last)).toBe(true);
    expect(shouldProcessScan("HTATT1.a.b", 1000 + 10 * DEFAULT_SCAN_COOLDOWN_MS, last)).toBe(true);
  });

  it("processes a different code immediately, even inside the cooldown", () => {
    const last = markScanned("HTATT1.a.b", 1000);
    expect(shouldProcessScan("HTATT1.c.d", 1001, last)).toBe(true);
  });

  it("never processes an empty code", () => {
    expect(shouldProcessScan("", 1000, null)).toBe(false);
  });

  it("honours a custom cooldown", () => {
    const last = markScanned("x", 0);
    expect(shouldProcessScan("x", 499, last, 500)).toBe(false);
    expect(shouldProcessScan("x", 500, last, 500)).toBe(true);
  });
});
