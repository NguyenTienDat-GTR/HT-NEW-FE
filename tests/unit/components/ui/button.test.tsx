import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("keeps loading button disabled to avoid double submit", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Lưu thay đổi
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("passes a single child directly to Radix Slot when asChild is used", () => {
    render(
      <Button asChild variant="ghost">
        <Link href="/dashboard">Dashboard</Link>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).toHaveClass("rounded-[10px]");
  });
});
