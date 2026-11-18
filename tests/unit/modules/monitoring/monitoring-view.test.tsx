import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { MonitoringView } from "@/modules/monitoring/components/monitoring-view";
import { compareWithPrevious, formatDuration, formatMonitoringTime } from "@/modules/monitoring/format";
import type { MonitoringOverview } from "@/modules/monitoring/types";

vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/modules/analytics/components/lazy-charts", () => ({ TrendChart: ({ ariaLabel }: { ariaLabel: string }) => <div aria-label={ariaLabel} role="img" /> }));
vi.mock("@/modules/analytics/components/section-card", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/modules/analytics/components/section-card")>();
  return { ...original, SectionCard: ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => <section aria-label={title}><p>{description}</p>{children}</section> };
});

const overview: MonitoringOverview = {
  hours: 24,
  bucketMinutes: 60,
  from: "2026-11-17T08:00:00Z",
  generatedAt: "2026-11-18T08:00:00Z",
  summary: { totalRequests: 1200, serverErrors: 6, deniedRequests: 12, failedLogins: 15, uniqueIps: 9, uniqueAccounts: 7, privateIpRequests: 0, p95Ms: 1500 },
  previousSummary: { totalRequests: 1000, serverErrors: 0, deniedRequests: 12, failedLogins: 5, uniqueIps: 9, uniqueAccounts: 8, privateIpRequests: 0, p95Ms: 1000 },
  rateLimitedRequests: null,
  ipDataReliable: true,
  timeline: [{ time: "2026-11-18T07:00:00Z", requests: 10, serverErrors: 0, deniedRequests: 1, p95Ms: 80 }],
  topIps: [{ ipAddress: "203.0.113.5", requests: 300, accounts: 2, errors: 15, deniedRequests: 15, failedLogins: 15, lastSeenAt: "2026-11-18T07:59:00Z" }],
  topAccounts: [{ username: "quantri", requests: 200, ipAddresses: 1, errors: 0, lastSeenAt: "2026-11-18T07:58:00Z" }],
  busiestEndpoints: [{ method: "GET", path: "/api/leaders/{id}", requests: 90, serverErrors: 0, p95Ms: 120 }],
  slowestEndpoints: [{ method: "POST", path: "/api/training/courses", requests: 8, serverErrors: 1, p95Ms: 2400 }],
  alerts: [{ code: "LOGIN_ATTACK", severity: "CRITICAL", title: "Nghi dò mật khẩu từ 203.0.113.5", detail: "15 lần đăng nhập thất bại trong 60 phút qua." }],
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MonitoringView />
    </QueryClientProvider>,
  );
}

describe("định dạng số liệu giám sát", () => {
  it("hiển thị giờ Việt Nam", () => {
    expect(formatMonitoringTime("2026-11-18T08:05:00Z")).toBe("15:05 18/11");
  });

  it("đổi đơn vị thời gian xử lý", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(850)).toBe("850 ms");
    expect(formatDuration(1500)).toBe("1,5 giây");
  });

  it("so sánh với kỳ trước", () => {
    expect(compareWithPrevious(120, 100)).toEqual({ text: "+20%", direction: "up" });
    expect(compareWithPrevious(50, 100)).toEqual({ text: "−50%", direction: "down" });
    expect(compareWithPrevious(5, 5)).toEqual({ text: "Không đổi", direction: "same" });
    expect(compareWithPrevious(3, 0)).toEqual({ text: "+3", direction: "up" });
    expect(compareWithPrevious(3, undefined)).toBeNull();
  });
});

describe("MonitoringView", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("hiển thị cảnh báo, số liệu và các bảng", async () => {
    vi.mocked(apiFetch).mockResolvedValue(overview);
    renderView();

    expect(await screen.findByText("Nghi dò mật khẩu từ 203.0.113.5")).toBeInTheDocument();
    expect(screen.getByText("Nghiêm trọng")).toBeInTheDocument();
    expect(screen.getByText("1.200")).toBeInTheDocument();
    expect(screen.getByText("+20% so với kỳ trước")).toBeInTheDocument();
    expect(screen.getByText("Không đọc được bộ đếm")).toBeInTheDocument();
    expect(screen.getByText("quantri")).toBeInTheDocument();
    expect(screen.getByText("/api/leaders/{id}")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/system/monitoring/overview?hours=24");
  });

  it("báo bình thường khi không có cảnh báo và nêu khi IP chưa đáng tin", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ...overview, alerts: [], ipDataReliable: false, previousSummary: null });
    renderView();

    expect(await screen.findByText("Chưa phát hiện bất thường trong 60 phút qua.")).toBeInTheDocument();
    expect(screen.getByText("Phần lớn là địa chỉ nội bộ, chưa phản ánh đúng từng người dùng.")).toBeInTheDocument();
    expect(screen.getAllByText("Chưa có kỳ trước").length).toBeGreaterThan(0);
  });

  it("tải lại theo khoảng thời gian được chọn", async () => {
    vi.mocked(apiFetch).mockResolvedValue(overview);
    renderView();
    await screen.findByText("quantri");

    await userEvent.click(screen.getByRole("button", { name: "7 ngày" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/system/monitoring/overview?hours=168"));
    expect(screen.getByRole("button", { name: "7 ngày" })).toHaveAttribute("aria-pressed", "true");
  });

  it("hiện lỗi và cho tải lại khi không lấy được số liệu", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("lỗi")).mockResolvedValue(overview);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Tải lại" }));

    expect(await screen.findByText("quantri")).toBeInTheDocument();
  });
});
