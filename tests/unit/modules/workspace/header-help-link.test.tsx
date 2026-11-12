import { TooltipProvider } from "@radix-ui/react-tooltip";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HeaderHelpLink, USER_GUIDE_URL } from "@/modules/workspace/components/header-help-link";

afterEach(cleanup);

describe("HeaderHelpLink", () => {
  it("mở trang hướng dẫn GitHub Pages ở tab mới, an toàn với opener", () => {
    render(
      <TooltipProvider>
        <HeaderHelpLink />
      </TooltipProvider>,
    );
    const link = screen.getByRole("link", { name: /hướng dẫn sử dụng/i });
    expect(link).toHaveAttribute("href", USER_GUIDE_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(USER_GUIDE_URL).toBe("https://nguyentiendat-gtr.github.io/HT-NEW-HuongDan/");
  });
});
