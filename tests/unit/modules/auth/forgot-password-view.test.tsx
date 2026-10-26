import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { ForgotPasswordView } from "@/modules/auth/components/forgot-password-view";

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

function lastBody(callIndex: number) {
  const [, options] = vi.mocked(apiFetch).mock.calls[callIndex];
  return JSON.parse(String((options as RequestInit).body));
}

async function requestOtp(user: ReturnType<typeof userEvent.setup>) {
  vi.mocked(apiFetch).mockResolvedValueOnce({ maskedEmail: "ng***@g***.com", expiresInSeconds: 300, resendAfterSeconds: 60 });
  await user.type(screen.getByLabelText("Tên đăng nhập"), "  gx.phuoc.hoa ");
  await user.click(screen.getByRole("button", { name: "Gửi mã OTP" }));
}

describe("ForgotPasswordView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for the username first and keeps the submit button disabled while it is empty", () => {
    render(<ForgotPasswordView />);

    expect(screen.getByRole("button", { name: "Gửi mã OTP" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Quay lại đăng nhập" })).toHaveAttribute("href", "/login");
  });

  it("sends the trimmed username and shows only the masked email on the OTP step", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordView />);

    await requestOtp(user);

    await waitFor(() => expect(screen.getByText("ng***@g***.com")).toBeInTheDocument());
    const [path] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe("/auth/forgot-password/otp");
    expect(lastBody(0)).toEqual({ username: "gx.phuoc.hoa" });
    expect(screen.getByRole("group", { name: "Mã OTP gồm 6 chữ số" })).toBeInTheDocument();
  });

  it("shows the generic server error and stays on the username step when the account cannot be recovered", async () => {
    const user = userEvent.setup();
    const message = "Không thể khôi phục mật khẩu cho tài khoản này, vui lòng liên hệ quản trị viên";
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error(message));
    render(<ForgotPasswordView />);

    await user.type(screen.getByLabelText("Tên đăng nhập"), "ghost");
    await user.click(screen.getByRole("button", { name: "Gửi mã OTP" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
    expect(screen.getByLabelText("Tên đăng nhập")).toBeInTheDocument();
  });

  it("goes through OTP, new password and finishes with a link back to login", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordView />);
    await requestOtp(user);
    await screen.findByRole("group", { name: "Mã OTP gồm 6 chữ số" });

    vi.mocked(apiFetch).mockResolvedValueOnce({ resetToken: "reset-token", expiresInSeconds: 600 });
    await user.click(screen.getByLabelText("Chữ số 1"));
    await user.paste("123456");

    await screen.findByLabelText("Mật khẩu mới");
    expect(vi.mocked(apiFetch).mock.calls[1][0]).toBe("/auth/forgot-password/otp/verify");
    expect(lastBody(1)).toEqual({ username: "gx.phuoc.hoa", otp: "123456" });
    // Quên mật khẩu không có mật khẩu hiện tại để so sánh.
    expect(screen.queryByText("Khác mật khẩu hiện tại")).not.toBeInTheDocument();

    vi.mocked(apiFetch).mockResolvedValueOnce(null);
    await user.type(screen.getByLabelText("Mật khẩu mới"), "MatKhauMoi123");
    await user.type(screen.getByLabelText("Xác nhận mật khẩu mới"), "MatKhauMoi123");
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));

    await screen.findByText("Đặt lại mật khẩu thành công");
    expect(vi.mocked(apiFetch).mock.calls[2][0]).toBe("/auth/forgot-password/reset");
    expect(lastBody(2)).toEqual({
      username: "gx.phuoc.hoa",
      resetToken: "reset-token",
      newPassword: "MatKhauMoi123",
      confirmPassword: "MatKhauMoi123",
    });
    expect(screen.getByRole("link", { name: "Về trang đăng nhập" })).toHaveAttribute("href", "/login");
  });

  it("offers to restart with a new OTP when the reset session has expired", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordView />);
    await requestOtp(user);
    await screen.findByRole("group", { name: "Mã OTP gồm 6 chữ số" });
    vi.mocked(apiFetch).mockResolvedValueOnce({ resetToken: "reset-token", expiresInSeconds: 600 });
    await user.click(screen.getByLabelText("Chữ số 1"));
    await user.paste("123456");
    await screen.findByLabelText("Mật khẩu mới");

    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Phiên khôi phục mật khẩu đã hết hạn, vui lòng xác thực OTP lại"));
    await user.type(screen.getByLabelText("Mật khẩu mới"), "MatKhauMoi123");
    await user.type(screen.getByLabelText("Xác nhận mật khẩu mới"), "MatKhauMoi123");
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));

    await user.click(await screen.findByRole("button", { name: "Gửi mã OTP khác" }));
    expect(screen.getByLabelText("Tên đăng nhập")).toBeInTheDocument();
  });
});
