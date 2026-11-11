import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { statChipCountUrl, TabStatChips } from "@/modules/training-courses/components/tab-stat-chips";

const apiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

afterEach(() => {
  cleanup();
  apiFetch.mockReset();
});

function renderChips(total?: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TabStatChips
        chips={[
          { label: "Tổng số hồ sơ" },
          { label: "Đạt", filters: { result: "COMPLETED" }, tone: "success" },
        ]}
        courseCode="KH-1"
        endpoint="/training/scores"
        total={total}
      />
    </QueryClientProvider>,
  );
}

describe("TabStatChips", () => {
  it("asks for a single row because only the total is used", () => {
    const url = statChipCountUrl("/training/scores", "KH-1", { result: "COMPLETED" });
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("size")).toBe("1");
    expect(params.get("page")).toBe("0");
    expect(decodeURIComponent(url)).toContain("KH-1");
    expect(decodeURIComponent(url)).toContain("COMPLETED");
  });

  it("reuses the tab total for the unfiltered chip and only fetches filtered chips", async () => {
    apiFetch.mockResolvedValue({ content: [], totalElements: 7 });
    renderChips(12);

    expect(screen.getByText("Tổng số hồ sơ").parentElement).toHaveTextContent("12");
    await waitFor(() => expect(screen.getByText("Đạt").parentElement).toHaveTextContent("7"));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(String(apiFetch.mock.calls[0][0])).toContain("COMPLETED");
  });

  it("shows a dash while the tab total is not loaded yet", () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    renderChips(undefined);
    expect(screen.getByText("Tổng số hồ sơ").parentElement).toHaveTextContent("–");
  });
});
