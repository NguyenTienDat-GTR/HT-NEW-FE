import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { AuthGate } from "@/modules/workspace/components/auth-gate";

const replace = vi.fn();
const apiFetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  refreshAccessToken: vi.fn().mockResolvedValue("token"),
}));

function renderGate() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthGate initialUser={null}>
        <div>Nội dung ứng dụng</div>
      </AuthGate>
    </QueryClientProvider>,
  );
}

describe("AuthGate khi kiểm tra phiên lỗi", () => {
  beforeEach(() => {
    replace.mockReset();
    apiFetch.mockReset();
    useAuthStore.setState({ user: null, accessToken: "token" });
  });

  it("lỗi 401: chuyển về trang đăng nhập ngay, không thử lại", async () => {
    apiFetch.mockRejectedValue(Object.assign(new Error("hết phiên"), { status: 401 }));
    renderGate();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=%2Fdashboard"));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("lỗi tạm thời (503): thử lại, không đá ra đăng nhập, rồi báo không kết nối được và cho thử lại", async () => {
    apiFetch.mockRejectedValue(Object.assign(new Error("bảo trì"), { status: 503 }));
    renderGate();

    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Nội dung ứng dụng")).toBeNull();
    expect(apiFetch).toHaveBeenCalledTimes(4);

    apiFetch.mockResolvedValue({ username: "admin", roles: [], permissions: [], unitLocked: false, mustChangePassword: false });
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Nội dung ứng dụng")).toBeTruthy();
  });
});
