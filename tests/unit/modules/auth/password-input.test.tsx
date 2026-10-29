import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PasswordInput } from "@/modules/auth/components/password-input";

afterEach(cleanup);

describe("PasswordInput", () => {
  it("hides the password by default and toggles visibility", () => {
    render(
      <span className="relative">
        <PasswordInput aria-label="Mật khẩu mới" defaultValue="Bí-mật-1" />
      </span>,
    );
    const input = screen.getByLabelText("Mật khẩu mới");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
