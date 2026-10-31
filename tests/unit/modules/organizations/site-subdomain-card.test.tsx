import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteSubdomainCard } from "@/modules/organizations/components/site-subdomain-card";

const apiMutation = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiMutation: (...args: unknown[]) => apiMutation(...args),
  getApiErrorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error)),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderCard(row: Record<string, unknown>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SiteSubdomainCard dioceseId="d-1" row={row} />
    </QueryClientProvider>,
  );
}

describe("SiteSubdomainCard", () => {
  beforeEach(() => apiMutation.mockReset());

  it("báo chưa cấu hình tên miền chính khi BE không trả siteBaseDomain", () => {
    renderCard({ siteSubdomain: null });
    expect(screen.getByText(/chưa cấu hình tên miền chính/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /cấp subdomain/i })).toBeNull();
  });

  it("điền sẵn gợi ý từ tên giáo phận nhưng không tự cấp", () => {
    renderCard({ name: "Xuân Lộc", siteBaseDomain: "clead.io.vn", siteSubdomain: null });

    expect((screen.getByLabelText("Subdomain") as HTMLInputElement).value).toBe("xuanloc");
    expect(screen.getByText(/Gợi ý từ tên giáo phận/)).toBeTruthy();
    expect(apiMutation).not.toHaveBeenCalled();
  });

  it("đã có subdomain thì giữ giá trị hiện tại, không ghi đè bằng gợi ý", () => {
    renderCard({ name: "Xuân Lộc", siteBaseDomain: "clead.io.vn", siteSubdomain: "xl", siteUrl: "https://xl.clead.io.vn" });

    expect((screen.getByLabelText("Subdomain") as HTMLInputElement).value).toBe("xl");
  });

  it("cấp subdomain: chuẩn hóa chữ thường rồi gọi PUT", async () => {
    apiMutation.mockResolvedValue({});
    renderCard({ siteBaseDomain: "clead.io.vn", siteSubdomain: null });

    expect(screen.getByText("Chưa cấp subdomain")).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Subdomain"), "PhuCuong");
    await userEvent.click(screen.getByRole("button", { name: "Cấp subdomain" }));

    await waitFor(() => expect(apiMutation).toHaveBeenCalledWith("/dioceses/d-1/site-subdomain", "PUT", { siteSubdomain: "phucuong" }));
  });

  it("chặn nhãn dành riêng ngay ở FE, không gọi API", async () => {
    renderCard({ siteBaseDomain: "clead.io.vn", siteSubdomain: null });

    await userEvent.type(screen.getByLabelText("Subdomain"), "test");
    fireEvent.blur(screen.getByLabelText("Subdomain"));

    expect(await screen.findByText(/dành riêng cho hệ thống/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Cấp subdomain" }) as HTMLButtonElement).disabled).toBe(true);
    expect(apiMutation).not.toHaveBeenCalled();
  });

  it("thu hồi cần xác nhận rồi gọi DELETE", async () => {
    apiMutation.mockResolvedValue({});
    renderCard({ siteBaseDomain: "clead.io.vn", siteSubdomain: "phucuong", siteUrl: "https://phucuong.clead.io.vn" });

    expect(screen.getByText("phucuong.clead.io.vn")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Thu hồi" }));
    expect(apiMutation).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận thu hồi" }));

    await waitFor(() => expect(apiMutation).toHaveBeenCalledWith("/dioceses/d-1/site-subdomain", "DELETE"));
  });
});
