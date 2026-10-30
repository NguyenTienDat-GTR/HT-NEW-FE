import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, PAGE_SIZE, buildLibraryParams } from "@/modules/certificates/certificate-library-params";

describe("buildLibraryParams", () => {
  it("always sends page and size", () => {
    const params = new URLSearchParams(buildLibraryParams({ search: "", filters: EMPTY_FILTERS, sort: "default", page: 2 }));
    expect(params.get("page")).toBe("2");
    expect(params.get("size")).toBe(String(PAGE_SIZE));
    expect(params.has("search")).toBe(false);
    expect(params.has("filters")).toBe(false);
    expect(params.has("sortBy")).toBe(false);
  });

  it("sends only the filters that are set, as a JSON object", () => {
    const params = new URLSearchParams(
      buildLibraryParams({ search: "mẫu", filters: { ...EMPTY_FILTERS, scope: "DIOCESE", paperSize: "A4" }, sort: "default", page: 0 }),
    );
    expect(params.get("search")).toBe("mẫu");
    expect(JSON.parse(params.get("filters") ?? "{}")).toEqual({ scope: "DIOCESE", paperSize: "A4" });
  });

  it("maps the UI sort option to sortBy and sortDirection", () => {
    const params = new URLSearchParams(buildLibraryParams({ search: "", filters: EMPTY_FILTERS, sort: "used-desc", page: 0 }));
    expect(params.get("sortBy")).toBe("usedByCount");
    expect(params.get("sortDirection")).toBe("DESC");
  });
});
