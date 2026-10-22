import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteConfig } from "@/config/routes/routes";
import { useResourceQueryState } from "@/components/common/resource/use-resource-query-state";

let currentSearch = "";
const replace = vi.fn((url: string) => {
  currentSearch = url.split("?")[1] ?? "";
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/leaders",
  useRouter: () => ({ replace, push: replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const route = {
  path: "/leaders",
  endpoint: "/leaders",
  filters: [{ key: "gender", label: "Giới tính", type: "select" }],
} as unknown as RouteConfig;

describe("useResourceQueryState filter persistence", () => {
  beforeEach(() => {
    currentSearch = "";
    replace.mockClear();
    window.sessionStorage.clear();
  });

  it("restores the saved filters when the list is opened again with a bare URL", () => {
    const first = renderHook(() => useResourceQueryState(route));
    act(() => first.result.current.updateFilter("gender", "NAM"));
    first.unmount();

    // Quay lại từ trang khác / sau khi mở modal: URL không còn tham số bộ lọc.
    currentSearch = "";
    const second = renderHook(() => useResourceQueryState(route));
    expect(second.result.current.filterValues.gender).toBe("NAM");
    expect(second.result.current.queryString).toContain("NAM");
  });

  it("keeps the filters when a modal link only adds the detail parameter", () => {
    const first = renderHook(() => useResourceQueryState(route));
    act(() => first.result.current.updateFilter("gender", "NU"));
    first.unmount();

    currentSearch = "detail=abc";
    const second = renderHook(() => useResourceQueryState(route));
    expect(second.result.current.filterValues.gender).toBe("NU");
  });

  it("does not restore filters after the user resets them", () => {
    const first = renderHook(() => useResourceQueryState(route));
    act(() => first.result.current.updateFilter("gender", "NAM"));
    act(() => first.result.current.resetFilters());
    first.unmount();

    currentSearch = "";
    const second = renderHook(() => useResourceQueryState(route));
    expect(second.result.current.filterValues.gender).toBe("");
  });
});
