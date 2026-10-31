import { describe, expect, it } from "vitest";
import { filtersParam, withFilters } from "@/lib/api/filters";
import { resourceKey, resourceListKey } from "@/lib/api/query-keys";

describe("resource query keys", () => {
  it("keeps every key under the shared root so a bare key invalidates everything", () => {
    expect(resourceKey()).toEqual(["resource"]);
    expect(resourceKey("/leaders")).toEqual(["resource", "/leaders"]);
    expect(resourceListKey("/leaders", "page=0")).toEqual(["resource", "/leaders", "page=0"]);
    expect(resourceKey("/leaders", "picker", 2)).toEqual(["resource", "/leaders", "picker", 2]);
  });
});

describe("filters query param", () => {
  it("encodes the JSON object", () => {
    expect(filtersParam({ "deanery.id": "a b" })).toBe(`filters=${encodeURIComponent('{"deanery.id":"a b"}')}`);
  });

  it("appends with ? or & depending on the existing query", () => {
    expect(withFilters("/parishes", { unitType: "PARISH" })).toBe(`/parishes?filters=${encodeURIComponent('{"unitType":"PARISH"}')}`);
    expect(withFilters("/parishes?size=5", { unitType: "PARISH" })).toBe(`/parishes?size=5&filters=${encodeURIComponent('{"unitType":"PARISH"}')}`);
  });
});
