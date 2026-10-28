import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_DEBOUNCE_MS } from "@/lib/use-debounced-value";
import { useQuickSearch } from "@/modules/search/hooks/use-quick-search";

const apiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useQuickSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiFetch.mockReset();
    apiFetch.mockResolvedValue([{ type: "leader", label: "Huynh trưởng", items: [{ id: "1", title: "Nguyễn A" }] }]);
  });
  afterEach(() => vi.useRealTimers());

  it("does not call the API for terms shorter than two characters", () => {
    renderHook(() => useQuickSearch("n"), { wrapper });
    act(() => void vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("waits for the debounce, then requests the encoded term once", async () => {
    const { result, rerender } = renderHook(({ term }) => useQuickSearch(term), { wrapper, initialProps: { term: "" } });
    rerender({ term: "nguyễn đ" });
    act(() => void vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
    expect(apiFetch).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(100));
    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(`/search/quick?q=${encodeURIComponent("nguyễn đ")}&limit=5`);
  });
});
