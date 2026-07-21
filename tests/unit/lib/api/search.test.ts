import { describe, expect, it } from "vitest";
import { serializeBaseSearch } from "@/lib/api/search";

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

  it("keeps role-permission role and effect filters in the JSON filters payload", () => {
    const query = serializeBaseSearch({
      page: 0,
      size: 10,
      filters: { "role.roleCode": "ADMIN_DIOCESE", effect: "ALLOW" },
    });

    expect(query.get("filters")).toBe(JSON.stringify({ "role.roleCode": "ADMIN_DIOCESE", effect: "ALLOW" }));
    expect(query.get("role.roleCode")).toBeNull();
    expect(query.get("effect")).toBeNull();
  });
});
