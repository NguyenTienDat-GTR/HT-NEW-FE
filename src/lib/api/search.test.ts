import { describe, expect, it } from "vitest";
import { serializeBaseSearch } from "./search";

describe("serializeBaseSearch", () => {
  it("serializes filters as JSON and keeps paging constraints in query shape", () => {
    const query = serializeBaseSearch({
      page: 2,
      size: 20,
      search: "An",
      searchFields: ["fullName", "parish.id"],
      filters: { status: true, empty: "", parishId: "p1" },
      sortBy: "fullName",
      sortDirection: "ASC",
    });

    expect(query.get("page")).toBe("2");
    expect(query.get("size")).toBe("20");
    expect(query.getAll("searchFields")).toEqual(["fullName", "parish.id"]);
    expect(query.get("filters")).toBe(JSON.stringify({ status: true, parishId: "p1" }));
  });
});
