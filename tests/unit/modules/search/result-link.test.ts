import { describe, expect, it } from "vitest";
import { flattenGroups, resultHref } from "@/modules/search/lib/result-link";

describe("resultHref", () => {
  it("opens detail pages for leaders, courses and certificates", () => {
    expect(resultHref({ type: "leader", id: "abc" })).toBe("/leaders/profiles/abc");
    expect(resultHref({ type: "course", id: "KHOA 01/2026" })).toBe("/training/courses/KHOA%2001%2F2026");
    expect(resultHref({ type: "certificate", id: "CC-1" })).toBe("/certificates/CC-1");
  });

  it("opens the list drawer for organization units", () => {
    expect(resultHref({ type: "diocese", id: "d1" })).toBe("/organization/dioceses?detail=d1");
    expect(resultHref({ type: "deanery", id: "d2" })).toBe("/organization/deaneries?detail=d2");
    expect(resultHref({ type: "parish", id: "d3" })).toBe("/organization/parishes?detail=d3");
  });
});

describe("flattenGroups", () => {
  it("keeps group order and tags every item with its type", () => {
    const entries = flattenGroups([
      { type: "leader", label: "Huynh trưởng", items: [{ id: "1", title: "A" }] },
      { type: "parish", label: "Giáo xứ", items: [{ id: "2", title: "B" }, { id: "3", title: "C" }] },
    ]);
    expect(entries.map((entry) => `${entry.type}:${entry.id}`)).toEqual(["leader:1", "parish:2", "parish:3"]);
    expect(flattenGroups(undefined)).toEqual([]);
  });
});
