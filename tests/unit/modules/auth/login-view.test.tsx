import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const loginResponse = {
  accessToken: "access",
  tokenType: "Bearer",
  accessTokenExpiresInMs: 900000,
  user: { username: "tester", roles: ["ADMIN_PARISH"], permissions: [] },
};

describe("LoginView", () => {
  const originalLocation = window.location;
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, assign: assignMock } });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
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

  it("does not remember the login unless the box is ticked", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValueOnce(loginResponse);

    render(<LoginView />);
    await user.type(screen.getByLabelText("Tài khoản"), "tester");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const [path, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe("/auth/login");
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({ username: "tester", password: "secret", rememberMe: false });
  });

  it("sends rememberMe=true when the user ticks 'Ghi nhớ đăng nhập'", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValueOnce(loginResponse);

    render(<LoginView />);
    await user.type(screen.getByLabelText("Tài khoản"), "tester");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret");
    await user.click(screen.getByLabelText("Ghi nhớ đăng nhập"));
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const [, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(JSON.parse(String((options as RequestInit).body)).rememberMe).toBe(true);
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("sends a temporary-password account to the forced change-password page", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValueOnce({ ...loginResponse, user: { ...loginResponse.user, mustChangePassword: true } });

    render(<LoginView />);
    await user.type(screen.getByLabelText("Tài khoản"), "tester");
    await user.type(screen.getByLabelText("Mật khẩu"), "TempPass");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/change-password"));
  });

  it("links 'Quên mật khẩu?' to the forgot password page", () => {
    render(<LoginView />);

    expect(screen.getByRole("link", { name: "Quên mật khẩu?" })).toHaveAttribute("href", "/forgot-password");
  });
});
