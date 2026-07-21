import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { LoginView } from "@/modules/auth/components/login-view";

const replaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
  getApiErrorMessage: (error: unknown) => (error instanceof Error && error.message ? error.message : "Không thể hoàn tất yêu cầu"),
}));

describe("LoginView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the server login error as a toast and form error without redirecting", async () => {
    const user = userEvent.setup();
    const message = "Tên đăng nhập hoặc mật khẩu không đúng";
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error(message));

    render(<LoginView />);

    await user.type(screen.getByLabelText("Tài khoản"), "wrong-user");
    await user.type(screen.getByLabelText("Mật khẩu"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
