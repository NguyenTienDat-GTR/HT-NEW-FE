import { describe, expect, it } from "vitest";
import { findRoute, matchRoute } from "@/config/routes/routes";

describe("leader routes", () => {
  it("matches leader profile detail pages", () => {
    const match = matchRoute("/leaders/profiles/leader-123");

    expect(match?.type).toBe("detail");
    expect(match?.params).toEqual({ id: "leader-123" });
    expect(match?.route.kind).toBe("leaders");
  });

  it("keeps the leader profile list route separate from detail route", () => {
    const route = findRoute("/leaders/profiles");

    expect(route?.detailPath).toBe("/leaders/profiles/:id");
    expect(matchRoute("/leaders/profiles")?.type).toBe("list");
  });
});
