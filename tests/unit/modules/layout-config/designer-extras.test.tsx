import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LayoutItem } from "@/modules/certificates/components/certificate-design";
import { rulerSteps } from "@/modules/layout-config/wysiwyg/design-stage";
import { clampZoom, DEFAULT_STAGE_VIEW, parseStageView, stepZoom } from "@/modules/layout-config/wysiwyg/stage-view";
import { LayoutSidebar } from "@/modules/layout-config/wysiwyg/layout-sidebar";
import { WarningsButton } from "@/modules/layout-config/wysiwyg/warnings-button";
import { VersionHistoryButton } from "@/modules/layout-config/wysiwyg/version-history";

const apiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  getApiErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Lỗi"),
}));
const toast = { message: vi.fn() };
vi.mock("sonner", () => ({ toast: { message: (...a: unknown[]) => toast.message(...a) } }));

beforeEach(() => {
  apiFetch.mockReset();
  toast.message.mockReset();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(cleanup);

const item = (patch: Partial<LayoutItem>): LayoutItem => ({ type: "TEXT", text: "A", x: 0.5, y: 0.5, fontSize: 0.04, color: "#000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false, ...patch });

describe("stage view", () => {
  it("steps and clamps zoom", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(4, 1)).toBe(4);
    expect(stepZoom(0.25, -1)).toBe(0.25);
    expect(clampZoom(10)).toBe(4);
    expect(clampZoom(0.01)).toBe(0.25);
  });

  it("restores saved preferences but always opens fitted, and ignores garbage", () => {
    const view = parseStageView(JSON.stringify({ zoom: 3, grid: true, gridMm: 10, safeMm: 5, bgOpacity: 0.4 }));
    expect(view).toMatchObject({ zoom: 1, grid: true, gridMm: 10, safeMm: 5, bgOpacity: 0.4 });
    expect(parseStageView("not json")).toEqual(DEFAULT_STAGE_VIEW);
    expect(parseStageView(null)).toEqual(DEFAULT_STAGE_VIEW);
    expect(parseStageView(JSON.stringify({ gridMm: 999, bgOpacity: -4 })).gridMm).toBe(50);
    expect(parseStageView(JSON.stringify({ bgOpacity: -4 })).bgOpacity).toBe(0.1);
  });

  it("picks ruler ticks that stay readable at any zoom", () => {
    const wide = rulerSteps(8); // 8px / mm
    expect(wide.minor * 8).toBeGreaterThanOrEqual(6);
    expect(wide.label * 8).toBeGreaterThanOrEqual(48);
    const tight = rulerSteps(0.5);
    expect(tight.label).toBe(100);
    expect(tight.label % tight.minor).toBe(0);
  });
});

describe("LayoutSidebar layers", () => {
  function setup(layout: LayoutItem[]) {
    const onLayoutChange = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <LayoutSidebar fields={[{ key: "courseName", label: "Tên khóa", group: "Khóa" }]} layout={layout} onLayoutChange={onLayoutChange} onPickField={() => undefined} onSelectionChange={onSelectionChange} selection={[]} />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Lớp/ }));
    return { onLayoutChange, onSelectionChange };
  }

  it("lists the top layer first and selects on click", () => {
    const { onSelectionChange } = setup([item({ text: "Dưới" }), item({ text: "Trên" })]);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Trên");
    fireEvent.click(screen.getByRole("button", { name: "Dưới" }));
    expect(onSelectionChange).toHaveBeenCalledWith([0]);
  });

  it("toggles hidden and locked through the layout updater", () => {
    const { onLayoutChange } = setup([item({ text: "A" })]);
    fireEvent.click(screen.getByRole("button", { name: "Ẩn phần tử (không in)" }));
    expect(onLayoutChange.mock.calls[0][0]([item({ text: "A" })])[0].hidden).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Khóa phần tử" }));
    expect(onLayoutChange.mock.calls[1][0]([item({ text: "A" })])[0].locked).toBe(true);
  });

  it("reorders a layer one step up and keeps it selected", () => {
    const { onLayoutChange, onSelectionChange } = setup([item({ text: "Dưới" }), item({ text: "Trên" })]);
    // "Dưới" là phần tử 0; đưa lên một lớp thì đổi chỗ với "Trên".
    const rows = screen.getAllByRole("listitem");
    fireEvent.click(rows[1].querySelector('button[aria-label="Đưa lên trên một lớp"]') as HTMLElement);
    expect(onLayoutChange.mock.calls[0][0]().map((i: LayoutItem) => i.text)).toEqual(["Trên", "Dưới"]);
    expect(onSelectionChange).toHaveBeenCalledWith([1]);
  });

  it("shows an empty state", () => {
    setup([]);
    expect(screen.getByText(/Chưa có phần tử nào/)).toBeInTheDocument();
  });
});

describe("WarningsButton", () => {
  it("shows the count and lets the user jump to the item", () => {
    const onSelect = vi.fn();
    render(<WarningsButton onSelect={onSelect} warnings={[{ id: "small-1", level: "warn", message: "Chữ 5.0pt nhỏ hơn 6pt", indexes: [1] }]} />);
    const trigger = screen.getByRole("button", { name: "Có 1 cảnh báo bố cục" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("Chữ 5.0pt nhỏ hơn 6pt"));
    expect(onSelect).toHaveBeenCalledWith([1]);
  });

  it("reports a clean layout", () => {
    render(<WarningsButton onSelect={() => undefined} warnings={[]} />);
    expect(screen.getByRole("button", { name: "Bố cục không có cảnh báo" })).toBeInTheDocument();
  });
});

describe("VersionHistoryButton", () => {
  const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);

  it("is disabled until the config is saved", () => {
    wrap(<VersionHistoryButton onRestore={() => undefined} path={null} queryKey="x" />);
    expect(screen.getByRole("button", { name: "Lịch sử phiên bản" })).toBeDisabled();
  });

  it("lists versions and restores the chosen one", async () => {
    apiFetch.mockResolvedValue([{ id: "v2", versionNo: 2, createdAt: "2026-11-03T10:00:00Z", createdBy: "admin", snapshot: { fieldLayout: [{}, {}] } }]);
    const onRestore = vi.fn();
    wrap(<VersionHistoryButton onRestore={onRestore} path="/certificates/config/c1/versions" queryKey="certificate" />);
    const trigger = screen.getByRole("button", { name: "Lịch sử phiên bản" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(trigger);
    expect(await screen.findByText("Bản 2")).toBeInTheDocument();
    expect(screen.getByText(/2 phần tử/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Khôi phục" }));
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: "v2", versionNo: 2 }));
    await waitFor(() => expect(toast.message).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith("/certificates/config/c1/versions");
  });
});
