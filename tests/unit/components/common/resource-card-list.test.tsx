import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResourceCardList, splitCardColumns } from "@/components/common/resource/resource-card-list";
import type { RouteConfig } from "@/config/routes/routes";

afterEach(cleanup);

describe("splitCardColumns", () => {
  it("uses the identifying column as title and puts status columns in badges", () => {
    expect(splitCardColumns(["imageUrl", "email", "fullName", "approvalStatus", "parishName"])).toEqual({
      title: "fullName",
      badges: ["approvalStatus"],
      details: ["email", "parishName"],
    });
  });

  it("falls back to the first non-status column", () => {
    expect(splitCardColumns(["status", "foo", "bar"]).title).toBe("foo");
  });
});

describe("ResourceCardList", () => {
  const route = { kind: "accounts", columns: ["username", "email", "status"], endpoint: "/x" } as unknown as RouteConfig;
  const rows = [{ id: "1", username: "user1", email: "a@x.vn", status: true }];

  it("renders one card per row with labelled fields and actions", () => {
    render(<ResourceCardList columns={route.columns} isLoading={false} renderActions={() => <button type="button">Xem</button>} route={route} rows={rows} size={10} />);
    expect(screen.getByText("user1")).toBeInTheDocument();
    expect(screen.getByText("a@x.vn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xem" })).toBeInTheDocument();
  });

  it("shows skeleton cards while loading", () => {
    const { container } = render(<ResourceCardList columns={route.columns} isLoading renderActions={() => null} route={route} rows={[]} size={3} />);
    expect(container.querySelectorAll("li")).toHaveLength(3);
    void vi;
  });
});
