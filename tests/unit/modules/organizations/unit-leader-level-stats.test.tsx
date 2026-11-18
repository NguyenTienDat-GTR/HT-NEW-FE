import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnitLeaderLevelStatsPanel, levelBarPercent } from "@/modules/organizations/components/unit-leader-level-stats";

const apiFetch = vi.fn();
let apiError: Error | null = null;

vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => {
    const result = apiFetch(...args);
    return apiError ? Promise.reject(apiError) : Promise.resolve(result);
  },
  getApiErrorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error)),
}));

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UnitLeaderLevelStatsPanel endpoint="/parishes" unitId="p-1" />
    </QueryClientProvider>,
  );
}

describe("levelBarPercent", () => {
  it("cấp không có ai thì không có thanh, cấp có người luôn thấy được", () => {
    expect(levelBarPercent(0, 10)).toBe(0);
    expect(levelBarPercent(10, 10)).toBe(100);
    expect(levelBarPercent(1, 1000)).toBe(4);
    expect(levelBarPercent(5, 0)).toBe(0);
  });
});

describe("UnitLeaderLevelStatsPanel", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiError = null;
  });

  it("mặc định thu gọn và chưa gọi API", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /thống kê huynh trưởng theo cấp độ/i }).getAttribute("aria-expanded")).toBe("false");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("mở ra thì tải và hiện số huynh trưởng từng cấp", async () => {
    apiFetch.mockReturnValue({
      total: 7,
      levels: [
        { levelCode: "NONE", levelName: "Chưa có cấp", displayOrder: 0, leaderCount: 2 },
        { levelCode: "HT_I", levelName: "Huynh trưởng cấp I", displayOrder: 3, leaderCount: 5 },
        { levelCode: "HT_II", levelName: "Huynh trưởng cấp II", displayOrder: 4, leaderCount: 0 },
      ],
    });
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /thống kê huynh trưởng theo cấp độ/i }));

    await waitFor(() => expect(screen.getByText("Huynh trưởng cấp I")).toBeTruthy());
    expect(apiFetch).toHaveBeenCalledWith("/parishes/p-1/leader-level-stats");
    expect(screen.getByText("Huynh trưởng cấp II")).toBeTruthy();
    expect(screen.getByText(/Tổng cộng 7 huynh trưởng/)).toBeTruthy();
  });

  it("báo lỗi bằng tiếng Việt khi API lỗi", async () => {
    apiError = new Error("Không có quyền xem");
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /thống kê huynh trưởng theo cấp độ/i }));

    await waitFor(() => expect(screen.getByText("Không có quyền xem")).toBeTruthy());
  });
});
