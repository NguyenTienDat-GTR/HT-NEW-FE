import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth/auth-store";
import { blankBadgeForm, formFromBadgeConfig, type BadgeConfig, type BadgeForm } from "@/modules/badges/badge-design";
import { BadgeCardSettings } from "@/modules/badges/components/badge-card-settings";
import { BadgeConfigView } from "@/modules/badges/components/badge-config-view";
import { BadgeEditor } from "@/modules/badges/components/badge-editor";
import { BadgeLayoutInspector } from "@/modules/badges/components/badge-layout-inspector";
import { BadgeLibrary, EMPTY_LIBRARY_FILTERS } from "@/modules/badges/components/badge-library";
import { BadgeSheetPreview } from "@/modules/badges/components/badge-sheet-preview";
import type { FieldCatalogItem, LayoutItem } from "@/modules/certificates/components/certificate-design";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn() } }));

const envelope = (data: unknown, status = 200) => new Response(JSON.stringify({ success: status < 400, data, message: status < 400 ? null : "Lỗi máy chủ" }), { status, headers: { "content-type": "application/json" } });
const pageOf = (content: unknown[]) => envelope({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, size: 6, number: 0, first: true, last: true });

function wrap(ui: React.ReactElement) {
  return render(
    <Tooltip.Provider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
    </Tooltip.Provider>,
  );
}

function item(overrides: Partial<LayoutItem> = {}): LayoutItem {
  return { type: "FIELD", fieldKey: "holyName", x: 0.5, y: 0.5, fontSize: 0.1, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false, ...overrides };
}

const FIELDS: FieldCatalogItem[] = [
  { key: "holyName", label: "Tên thánh", group: "Huynh trưởng" },
  { key: "teamName", label: "Tên đội", group: "Đội" },
];

beforeEach(() => {
  useAuthStore.getState().setAccessToken("token");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  useAuthStore.getState().clear();
  window.sessionStorage.clear();
});

describe("BadgeSheetPreview", () => {
  it("shows how many cards fit one page", () => {
    render(<BadgeSheetPreview form={blankBadgeForm()} />);
    expect(screen.getByText("10 thẻ / trang")).toBeInTheDocument();
    expect(screen.getByText(/2 cột × 5 hàng/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Khổ A4 xếp 10 thẻ" })).toBeInTheDocument();
  });

  it("warns when the card does not fit the paper", () => {
    render(<BadgeSheetPreview form={{ ...blankBadgeForm(), paperSize: "A5", cardWidthMm: 200 }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Thẻ không xếp vừa khổ giấy");
  });

  it("numbers the cards and mirrors the back side", () => {
    const { container, rerender } = render(<BadgeSheetPreview form={blankBadgeForm()} />);
    const firstFront = container.querySelector("g text")?.getAttribute("x");
    rerender(<BadgeSheetPreview form={blankBadgeForm()} side="back" />);
    const firstBack = container.querySelector("g text")?.getAttribute("x");
    expect(firstFront).not.toBe(firstBack);
    rerender(<BadgeSheetPreview flipEdge="SHORT" form={blankBadgeForm()} side="back" />);
    expect(container.querySelector("g text")?.getAttribute("x")).toBe(firstFront);
  });
});

describe("BadgeCardSettings", () => {
  function setup(form: BadgeForm = blankBadgeForm(), errors: string[] = [], disabled = false) {
    const onChange = vi.fn();
    wrap(<BadgeCardSettings disabled={disabled} errors={errors} form={form} onChange={onChange} />);
    return onChange;
  }

  it("selecting a preset applies its size in the current orientation", () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText("Kích thước thẻ"), { target: { value: "badge-148x105" } });
    expect(onChange).toHaveBeenCalledWith({ cardWidthMm: 148, cardHeightMm: 105 });
  });

  it("selecting a preset while portrait stands the card upright", () => {
    const onChange = setup({ ...blankBadgeForm(), cardOrientation: "PORTRAIT", cardWidthMm: 55, cardHeightMm: 90 });
    fireEvent.change(screen.getByLabelText("Kích thước thẻ"), { target: { value: "badge-100x70" } });
    expect(onChange).toHaveBeenCalledWith({ cardWidthMm: 70, cardHeightMm: 100 });
  });

  it("recognises the current size as a preset or as custom", () => {
    setup();
    expect((screen.getByLabelText("Kích thước thẻ") as HTMLSelectElement).value).toBe("badge-90x55");
    cleanup();
    setup({ ...blankBadgeForm(), cardWidthMm: 77, cardHeightMm: 50 });
    expect((screen.getByLabelText("Kích thước thẻ") as HTMLSelectElement).value).toBe("custom");
  });

  it("recognises a portrait preset too", () => {
    setup({ ...blankBadgeForm(), cardOrientation: "PORTRAIT", cardWidthMm: 55, cardHeightMm: 90 });
    expect((screen.getByLabelText("Kích thước thẻ") as HTMLSelectElement).value).toBe("badge-90x55");
  });

  it("switching to portrait swaps the dimensions", () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole("button", { name: "Dọc" }));
    expect(onChange).toHaveBeenCalledWith({ cardOrientation: "PORTRAIT", cardWidthMm: 55, cardHeightMm: 90 });
  });

  it("editing the width so the card gets taller than wide makes it portrait", () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText("Rộng (mm)"), { target: { value: "40" } });
    expect(onChange).toHaveBeenCalledWith({ cardWidthMm: 40, cardOrientation: "PORTRAIT" }, "cardWidth");
    fireEvent.change(screen.getByLabelText("Cao (mm)"), { target: { value: "30" } });
    expect(onChange).toHaveBeenLastCalledWith({ cardHeightMm: 30, cardOrientation: "LANDSCAPE" }, "cardHeight");
  });

  it("ignores half-typed numbers instead of producing NaN", () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText("Rộng (mm)"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ cardWidthMm: 90, cardOrientation: "LANDSCAPE" }, "cardWidth");
  });

  it("changes paper, margin, gap, crop marks and the back side", () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText("Khổ giấy in"), { target: { value: "A3" } });
    expect(onChange).toHaveBeenLastCalledWith({ paperSize: "A3" });
    fireEvent.change(screen.getByLabelText("Hướng giấy"), { target: { value: "LANDSCAPE" } });
    expect(onChange).toHaveBeenLastCalledWith({ paperOrientation: "LANDSCAPE" });
    fireEvent.change(screen.getByLabelText("Lề giấy (mm)"), { target: { value: "5" } });
    expect(onChange).toHaveBeenLastCalledWith({ marginMm: 5 }, "margin");
    fireEvent.change(screen.getByLabelText("Khoảng cách thẻ (mm)"), { target: { value: "2.5" } });
    expect(onChange).toHaveBeenLastCalledWith({ gapMm: 2.5 }, "gap");
    fireEvent.click(screen.getByLabelText("Vẽ viền cắt quanh mỗi thẻ"));
    expect(onChange).toHaveBeenLastCalledWith({ cropMarks: false });
    fireEvent.click(screen.getByLabelText("Thẻ có mặt sau (in hai mặt)"));
    expect(onChange).toHaveBeenLastCalledWith({ hasBack: true });
  });

  it("lists validation errors", () => {
    setup({ ...blankBadgeForm(), paperSize: "A5", cardWidthMm: 200 }, ["Thẻ 200 × 55 mm lớn hơn vùng in của khổ A5"]);
    expect(screen.getAllByRole("alert").some((alert) => alert.textContent?.includes("lớn hơn vùng in của khổ A5"))).toBe(true);
  });

  it("is read-only when disabled", () => {
    setup(blankBadgeForm(), [], true);
    expect(screen.getByLabelText("Kích thước thẻ")).toBeDisabled();
    expect(screen.getByLabelText("Rộng (mm)")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dọc" })).toBeDisabled();
    expect(screen.getByLabelText("Thẻ có mặt sau (in hai mặt)")).toBeDisabled();
  });
});

describe("BadgeLayoutInspector", () => {
  const fieldLabel = (key?: string) => FIELDS.find((field) => field.key === key)?.label ?? key ?? "";

  it("asks the user to pick an element when nothing is selected", () => {
    wrap(<BadgeLayoutInspector disabled={false} fieldLabel={fieldLabel} item={null} onChange={() => undefined} onRemove={() => undefined} />);
    expect(screen.getByText("Chưa chọn phần tử")).toBeInTheDocument();
  });

  it("edits a text element and removes it", () => {
    const onChange = vi.fn();
    const onRemove = vi.fn();
    wrap(<BadgeLayoutInspector disabled={false} fieldLabel={fieldLabel} item={item({ type: "TEXT", text: "Xin chào" })} onChange={onChange} onRemove={onRemove} />);
    expect(screen.getByText("Văn bản tĩnh")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Xin chào"), { target: { value: "Lưu ý" } });
    expect(onChange).toHaveBeenCalledWith({ text: "Lưu ý" }, "text");
    fireEvent.click(screen.getByRole("button", { name: "Xóa phần tử" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("edits typography of a field", () => {
    const onChange = vi.fn();
    wrap(<BadgeLayoutInspector disabled={false} fieldLabel={fieldLabel} item={item({ fieldKey: "teamName" })} onChange={onChange} onRemove={() => undefined} />);
    expect(screen.getByText("Tên đội")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cỡ chữ (% chiều cao thẻ)"), { target: { value: "15" } });
    expect(onChange).toHaveBeenLastCalledWith({ fontSize: 0.15 }, "fontSize");
    fireEvent.change(screen.getByLabelText("Cỡ chữ (% chiều cao thẻ)"), { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith({ fontSize: 0.3 }, "fontSize");
    fireEvent.click(screen.getByRole("button", { name: "Phải" }));
    expect(onChange).toHaveBeenLastCalledWith({ align: "right" });
    fireEvent.click(screen.getByRole("button", { name: "In đậm" }));
    expect(onChange).toHaveBeenLastCalledWith({ bold: true });
    fireEvent.click(screen.getByRole("button", { name: "In nghiêng" }));
    expect(onChange).toHaveBeenLastCalledWith({ italic: true });
    fireEvent.click(screen.getByRole("button", { name: "Gạch chân" }));
    expect(onChange).toHaveBeenLastCalledWith({ underline: true });
    fireEvent.change(screen.getByLabelText("Phông chữ"), { target: { value: "serif" } });
    expect(onChange).toHaveBeenLastCalledWith({ fontFamily: "serif" });
  });

  it("a QR element only has a size, clamped between 5% and 50%", () => {
    const onChange = vi.fn();
    wrap(<BadgeLayoutInspector disabled={false} fieldLabel={fieldLabel} item={item({ type: "QR", size: 0.3 })} onChange={onChange} onRemove={() => undefined} />);
    expect(screen.getByText("Mã QR điểm danh")).toBeInTheDocument();
    expect(screen.queryByLabelText("Phông chữ")).toBeNull();
    fireEvent.change(screen.getByLabelText("Kích thước mã QR (% chiều cao thẻ)"), { target: { value: "80" } });
    expect(onChange).toHaveBeenLastCalledWith({ size: 0.5 }, "qrSize");
    fireEvent.change(screen.getByLabelText("Kích thước mã QR (% chiều cao thẻ)"), { target: { value: "1" } });
    expect(onChange).toHaveBeenLastCalledWith({ size: 0.05 }, "qrSize");
  });

  it("disables every control when read-only", () => {
    wrap(<BadgeLayoutInspector disabled fieldLabel={fieldLabel} item={item()} onChange={() => undefined} onRemove={() => undefined} />);
    expect(screen.getByRole("button", { name: "Xóa phần tử" })).toBeDisabled();
    expect(screen.getByLabelText("Phông chữ")).toBeDisabled();
    expect(screen.getByRole("button", { name: "In đậm" })).toBeDisabled();
  });
});

describe("BadgeEditor", () => {
  // Áp updater lên form để kiểm tra kết quả như BE nhận được.
  function setup(initial: BadgeForm, canEdit = true) {
    let current = initial;
    const onChange = vi.fn((updater: (form: BadgeForm) => BadgeForm) => {
      current = updater(current);
    });
    wrap(<BadgeEditor canEdit={canEdit} fields={FIELDS} form={initial} onChange={onChange} />);
    return { onChange, get form() { return current; } };
  }

  it("shows only the front side for a one-sided card", () => {
    setup(blankBadgeForm());
    expect(screen.queryByRole("tab", { name: "Mặt sau" })).toBeNull();
    expect(screen.getByText(/Mặt trước chưa có phần tử nào/)).toBeInTheDocument();
  });

  it("adds a field, a text and a QR to the front side", () => {
    const ctx = setup(blankBadgeForm());
    fireEvent.change(screen.getByLabelText("Thêm phần tử"), { target: { value: "teamName" } });
    fireEvent.click(screen.getByRole("button", { name: /Thêm trường/ }));
    fireEvent.click(screen.getByRole("button", { name: /Văn bản/ }));
    fireEvent.click(screen.getByRole("button", { name: /Mã QR/ }));
    expect(ctx.form.frontLayout.map((layoutItem) => layoutItem.type)).toEqual(["FIELD", "TEXT", "QR"]);
    expect(ctx.form.frontLayout[0].fieldKey).toBe("teamName");
    expect(ctx.form.frontLayout[2].size).toBeGreaterThanOrEqual(0.05);
    expect(ctx.form.backLayout).toEqual([]);
  });

  it("add button stays disabled until a field is chosen", () => {
    setup(blankBadgeForm());
    expect(screen.getByRole("button", { name: /Thêm trường/ })).toBeDisabled();
  });

  it("edits the back side separately, including text and QR", () => {
    const ctx = setup({ ...blankBadgeForm(), hasBack: true, frontLayout: [item()] });
    fireEvent.click(screen.getByRole("tab", { name: "Mặt sau" }));
    expect(screen.getByText(/Mặt sau chưa có phần tử nào/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Văn bản/ }));
    fireEvent.click(screen.getByRole("button", { name: /Mã QR/ }));
    expect(ctx.form.backLayout.map((layoutItem) => layoutItem.type)).toEqual(["TEXT", "QR"]);
    expect(ctx.form.frontLayout).toHaveLength(1);
  });

  it("removing the selected element deletes it from the active side only", () => {
    const ctx = setup({ ...blankBadgeForm(), hasBack: true, frontLayout: [item({ fieldKey: "holyName" })], backLayout: [item({ type: "TEXT", text: "A" }), item({ type: "TEXT", text: "B" })] });
    fireEvent.click(screen.getByRole("tab", { name: "Mặt sau" }));
    fireEvent.pointerDown(screen.getByText("A"));
    fireEvent.click(screen.getByRole("button", { name: "Xóa phần tử" }));
    expect(ctx.form.backLayout.map((layoutItem) => layoutItem.text)).toEqual(["B"]);
    expect(ctx.form.frontLayout).toHaveLength(1);
  });

  it("read-only users get no editing toolbar and cannot upload", () => {
    setup(blankBadgeForm(), false);
    expect(screen.queryByRole("button", { name: /Văn bản/ })).toBeNull();
    expect(screen.queryByLabelText("Thêm phần tử")).toBeNull();
    expect(screen.getByText("Tải ảnh nền").closest("label")?.querySelector("input")).toBeDisabled();
  });

  it("rejects a non-image background and an oversized one", () => {
    const ctx = setup(blankBadgeForm());
    const input = screen.getByText("Tải ảnh nền").closest("label")!.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "a.txt", { type: "text/plain" })] } });
    expect(toast.error).toHaveBeenCalledWith("Chỉ nhận tệp ảnh (PNG, JPG...)");
    const huge = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(huge, "size", { value: 9 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [huge] } });
    expect(toast.error).toHaveBeenCalledWith("Ảnh nền tối đa 8 MB, hãy chọn ảnh nhỏ hơn");
    expect(ctx.onChange).not.toHaveBeenCalled();
  });

  it("stores an uploaded image as a data URL for the active side", async () => {
    const ctx = setup({ ...blankBadgeForm(), hasBack: true });
    fireEvent.click(screen.getByRole("tab", { name: "Mặt sau" }));
    const input = screen.getByText("Tải ảnh nền").closest("label")!.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["abc"], "nen.png", { type: "image/png" })] } });
    await waitFor(() => expect(ctx.form.backBackground).toMatch(/^data:image\/png;base64,/));
    expect(ctx.form.frontBackground).toBe("");
  });

  it("can remove an existing background", () => {
    const ctx = setup({ ...blankBadgeForm(), frontBackground: "data:image/png;base64,AAAA" });
    expect(screen.getByText("Đổi ảnh nền")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bỏ ảnh nền/ }));
    expect(ctx.form.frontBackground).toBe("");
  });

  it("switches between design and preview", () => {
    setup({ ...blankBadgeForm(), frontLayout: [item({ fieldKey: "teamName" })] });
    expect(screen.getByText("[Tên đội]")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Xem trước/ }));
    expect(screen.getByText("Đội 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Thiết kế/ }));
    expect(screen.getByText("[Tên đội]")).toBeInTheDocument();
  });
});

describe("BadgeLibrary", () => {
  const configs: BadgeConfig[] = [
    { id: "a", name: "Thẻ chung", isDefault: true, scopeLevel: "DEANERY", editable: true, paperSize: "A4", paperOrientation: "PORTRAIT", cardWidthMm: 90, cardHeightMm: 55, hasBack: true, cardsPerPage: 10 },
    { id: "b", name: "Thẻ giáo phận", isDefault: false, scopeLevel: "DIOCESE", editable: false, paperSize: "A5", paperOrientation: "LANDSCAPE", cardWidthMm: 85.6, cardHeightMm: 54, hasBack: false, cardsPerPage: 4 },
  ];

  function setup(props: Partial<React.ComponentProps<typeof BadgeLibrary>> = {}) {
    const handlers = { onSearchChange: vi.fn(), onFiltersChange: vi.fn(), onPageChange: vi.fn(), onSelect: vi.fn(), onCreate: vi.fn() };
    render(
      <Tooltip.Provider>
        <BadgeLibrary
          activeId="a"
          canCreate
          error={null}
          filters={EMPTY_LIBRARY_FILTERS}
          isNew={false}
          items={configs}
          loading={false}
          page={0}
          placeholder={false}
          searchInput=""
          totalElements={2}
          totalPages={1}
          {...handlers}
          {...props}
        />
      </Tooltip.Provider>,
    );
    return handlers;
  }

  it("lists configs with scope, sides, size and capacity", () => {
    setup();
    expect(screen.getByText("Thẻ chung")).toBeInTheDocument();
    expect(screen.getByText("Cấu hình chung")).toBeInTheDocument();
    expect(screen.getAllByText("Giáo hạt").length).toBeGreaterThan(1);
    expect(screen.getByText("Giáo phận · chỉ xem")).toBeInTheDocument();
    expect(screen.getByText("2 mặt")).toBeInTheDocument();
    expect(screen.getByText("1 mặt")).toBeInTheDocument();
    expect(screen.getByText(/Thẻ 85,6 × 54 mm · A5 ngang · 4 thẻ\/trang/)).toBeInTheDocument();
    expect(screen.getByText("Đang mở")).toBeInTheDocument();
  });

  it("selects a config and creates a new one", () => {
    const handlers = setup();
    fireEvent.click(screen.getByRole("button", { name: /Thẻ giáo phận/ }));
    expect(handlers.onSelect).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getByRole("button", { name: /Tạo cấu hình mới/ }));
    expect(handlers.onCreate).toHaveBeenCalled();
  });

  it("hides the create button without permission", () => {
    setup({ canCreate: false });
    expect(screen.queryByRole("button", { name: /Tạo cấu hình mới/ })).toBeNull();
  });

  it("reports search, filters and paging", () => {
    const handlers = setup({ totalPages: 3, page: 1, totalElements: 15 });
    fireEvent.change(screen.getByLabelText("Tìm theo tên cấu hình"), { target: { value: "thẻ" } });
    expect(handlers.onSearchChange).toHaveBeenCalledWith("thẻ");
    fireEvent.change(screen.getByLabelText("Lọc theo phạm vi"), { target: { value: "DEANERY" } });
    expect(handlers.onFiltersChange).toHaveBeenCalledWith({ scope: "DEANERY" });
    fireEvent.change(screen.getByLabelText("Lọc theo khổ giấy"), { target: { value: "A5" } });
    expect(handlers.onFiltersChange).toHaveBeenCalledWith({ paperSize: "A5" });
    fireEvent.change(screen.getByLabelText("Lọc theo mặt sau"), { target: { value: "true" } });
    expect(handlers.onFiltersChange).toHaveBeenCalledWith({ hasBack: "true" });
    fireEvent.click(screen.getByRole("button", { name: "Sau" }));
    expect(handlers.onPageChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Trước" }));
    expect(handlers.onPageChange).toHaveBeenCalledWith(0);
    expect(screen.getByText("15 cấu hình · Trang 2/3")).toBeInTheDocument();
  });

  it("disables paging at the ends", () => {
    setup();
    expect(screen.getByRole("button", { name: "Trước" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sau" })).toBeDisabled();
  });

  it("explains an empty library versus an empty filtered list", () => {
    const { unmount } = wrap(
      <BadgeLibrary activeId={null} canCreate error={null} filters={EMPTY_LIBRARY_FILTERS} isNew={false} items={[]} loading={false} onCreate={() => undefined} onFiltersChange={() => undefined} onPageChange={() => undefined} onSearchChange={() => undefined} onSelect={() => undefined} page={0} placeholder={false} searchInput="" totalElements={0} totalPages={0} />,
    );
    expect(screen.getByText(/Cấu hình đầu tiên bạn tạo sẽ tự động là cấu hình chung/)).toBeInTheDocument();
    unmount();
    wrap(
      <BadgeLibrary activeId={null} canCreate error={null} filters={{ ...EMPTY_LIBRARY_FILTERS, scope: "SYSTEM" }} isNew={false} items={[]} loading={false} onCreate={() => undefined} onFiltersChange={() => undefined} onPageChange={() => undefined} onSearchChange={() => undefined} onSelect={() => undefined} page={0} placeholder={false} searchInput="" totalElements={0} totalPages={0} />,
    );
    expect(screen.getByText(/Không có cấu hình nào khớp bộ lọc/)).toBeInTheDocument();
  });

  it("shows loading and error states and clears filters", () => {
    const handlers = setup({ loading: true, items: [], error: "Lỗi tải", filters: { ...EMPTY_LIBRARY_FILTERS, scope: "SYSTEM" } });
    expect(screen.getByText("Đang tải thư viện…")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Lỗi tải");
    fireEvent.click(screen.getByRole("button", { name: "Xóa lọc" }));
    expect(handlers.onSearchChange).toHaveBeenCalledWith("");
    expect(handlers.onFiltersChange).toHaveBeenCalledWith(EMPTY_LIBRARY_FILTERS);
  });
});

describe("BadgeConfigView", () => {
  const detail: BadgeConfig = {
    id: "cfg1",
    name: "Thẻ chung",
    isDefault: true,
    scopeLevel: "DEANERY",
    editable: true,
    paperSize: "A4",
    paperOrientation: "PORTRAIT",
    cardWidthMm: 90,
    cardHeightMm: 55,
    cardOrientation: "LANDSCAPE",
    marginMm: 10,
    gapMm: 0,
    cropMarks: true,
    hasBack: false,
    cardsPerPage: 10,
    frontBackground: null,
    backBackground: null,
    frontLayout: [item({ fieldKey: "holyName" })],
    backLayout: [],
  };
  const { frontLayout: _frontLayout, backLayout: _backLayout, frontBackground: _frontBackground, backBackground: _backBackground, ...summary } = detail;
  void _frontLayout; void _backLayout; void _frontBackground; void _backBackground;

  type Call = { url: string; method: string; body?: unknown };

  function mockApi(options: { configs?: BadgeConfig[]; detail?: BadgeConfig; saved?: BadgeConfig; failSave?: boolean } = {}) {
    const calls: Call[] = [];
    const configs = options.configs ?? [summary as BadgeConfig];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input).replace("/backend/api", "");
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (method !== "GET") {
        return options.failSave ? envelope(null, 409) : envelope(options.saved ?? { ...detail, name: "Thẻ chung" });
      }
      if (url.startsWith("/badges/config/options")) return envelope(configs);
      if (url.startsWith("/badges/config/fields")) return envelope(FIELDS);
      if (url.startsWith("/badges/config/")) return envelope(options.detail ?? detail);
      if (url.startsWith("/badges/config?")) return pageOf(configs);
      return envelope({});
    });
    return calls;
  }

  function login(permissions: string[]) {
    useAuthStore.getState().setUser({ username: "admin", roles: ["ADMIN_DEANERY"], permissions });
  }

  const route = { title: "Cấu hình thẻ tham dự", subtitle: "Mô tả" } as never;

  it("opens the default config, keeps save disabled until something changes, then saves with PUT", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.update.deanery", "training.badge_config.create.deanery"]);
    const calls = mockApi();
    wrap(<BadgeConfigView route={route} />);
    const name = (await screen.findByLabelText("Tên cấu hình")) as HTMLInputElement;
    await waitFor(() => expect(name.value).toBe("Thẻ chung"));
    expect(screen.getByRole("button", { name: "Lưu cấu hình" })).toBeDisabled();

    fireEvent.change(name, { target: { value: "Thẻ khóa Dự trưởng" } });
    expect(screen.getByText("Chưa lưu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));

    await waitFor(() => expect(calls.some((call) => call.method === "PUT")).toBe(true));
    const put = calls.find((call) => call.method === "PUT")!;
    expect(put.url).toBe("/badges/config/cfg1");
    expect(put.body).toMatchObject({ name: "Thẻ khóa Dự trưởng", paperSize: "A4", cardWidthMm: 90, cardHeightMm: 55, cardOrientation: "LANDSCAPE", hasBack: false, backLayout: [], backBackground: null });
    expect((put.body as { frontLayout: unknown[] }).frontLayout).toHaveLength(1);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Lưu cấu hình thẻ tham dự thành công"));
  });

  it("tells the user when the saved name got a numeric suffix", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.update.deanery"]);
    mockApi({ saved: { ...detail, name: "Thẻ mới (1)" } });
    wrap(<BadgeConfigView route={route} />);
    const name = (await screen.findByLabelText("Tên cấu hình")) as HTMLInputElement;
    await waitFor(() => expect(name.value).toBe("Thẻ chung"));
    fireEvent.change(name, { target: { value: "Thẻ mới" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));
    await waitFor(() => expect(toast.message).toHaveBeenCalledWith('Tên "Thẻ mới" đã tồn tại nên được lưu là "Thẻ mới (1)".'));
  });

  it("shows the server error when saving fails", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.update.deanery"]);
    mockApi({ failSave: true });
    wrap(<BadgeConfigView route={route} />);
    const name = (await screen.findByLabelText("Tên cấu hình")) as HTMLInputElement;
    await waitFor(() => expect(name.value).toBe("Thẻ chung"));
    fireEvent.change(name, { target: { value: "Khác" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Lỗi máy chủ"));
  });

  it("blocks saving a card that does not fit the paper and explains why", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.update.deanery"]);
    mockApi();
    wrap(<BadgeConfigView route={route} />);
    await waitFor(() => expect((screen.getByLabelText("Tên cấu hình") as HTMLInputElement).value).toBe("Thẻ chung"));
    fireEvent.change(screen.getByLabelText("Rộng (mm)"), { target: { value: "250" } });
    expect(await screen.findByText(/lớn hơn vùng in của khổ A4/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu cấu hình" })).toBeDisabled();
    expect(screen.getByText("Sửa các lỗi ở phần khổ thẻ trước khi lưu.")).toBeInTheDocument();
  });

  it("view-only users can look but not edit, save or delete", async () => {
    login(["training.badge_config.read.deanery"]);
    mockApi();
    wrap(<BadgeConfigView route={route} />);
    await waitFor(() => expect((screen.getByLabelText("Tên cấu hình") as HTMLInputElement).value).toBe("Thẻ chung"));
    expect(screen.getByLabelText("Tên cấu hình")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lưu cấu hình" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Tạo cấu hình mới/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Xóa cấu hình/ })).toBeNull();
    expect(screen.getByText("Bạn chỉ có quyền xem thư viện cấu hình.")).toBeInTheDocument();
  });

  it("a config of a higher level is read-only and can be copied into the user's own", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.update.deanery", "training.badge_config.create.deanery"]);
    const inherited = { ...detail, editable: false, scopeLevel: "DIOCESE" as const };
    const calls = mockApi({ configs: [{ ...summary, editable: false, scopeLevel: "DIOCESE" } as BadgeConfig], detail: inherited });
    wrap(<BadgeConfigView route={route} />);
    await screen.findByText(/thuộc cấp giáo phận, bạn chỉ được xem và dùng/);
    expect(screen.getByLabelText("Tên cấu hình")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Lưu thành cấu hình mới/ }));
    await waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    expect(calls.find((call) => call.method === "POST")?.url).toBe("/badges/config");
  });

  it("the default config cannot be deleted, a non-default one can after confirmation", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.update.deanery", "training.badge_config.delete.deanery"]);
    const calls = mockApi({ configs: [{ ...summary, isDefault: false } as BadgeConfig], detail: { ...detail, isDefault: false } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    wrap(<BadgeConfigView route={route} />);
    await waitFor(() => expect((screen.getByLabelText("Tên cấu hình") as HTMLInputElement).value).toBe("Thẻ chung"));
    expect(screen.getByRole("button", { name: /Đặt làm cấu hình chung/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Xóa cấu hình/ }));
    await waitFor(() => expect(calls.some((call) => call.method === "DELETE")).toBe(true));
    expect(calls.find((call) => call.method === "DELETE")?.url).toBe("/badges/config/cfg1");
  });

  it("deleting is blocked for the default config", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.update.deanery", "training.badge_config.delete.deanery"]);
    mockApi();
    wrap(<BadgeConfigView route={route} />);
    await waitFor(() => expect((screen.getByLabelText("Tên cấu hình") as HTMLInputElement).value).toBe("Thẻ chung"));
    expect(screen.getByRole("button", { name: /Xóa cấu hình/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Đặt làm cấu hình chung/ })).toBeNull();
  });

  it("does not delete when the user cancels the confirmation", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.delete.deanery"]);
    const calls = mockApi({ configs: [{ ...summary, isDefault: false } as BadgeConfig], detail: { ...detail, isDefault: false } });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    wrap(<BadgeConfigView route={route} />);
    await waitFor(() => expect((screen.getByLabelText("Tên cấu hình") as HTMLInputElement).value).toBe("Thẻ chung"));
    fireEvent.click(screen.getByRole("button", { name: /Xóa cấu hình/ }));
    expect(window.confirm).toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("starts a blank config when the library is empty and the user can create", async () => {
    login(["training.badge_config.read.deanery", "training.badge_config.create.deanery"]);
    const calls = mockApi({ configs: [] });
    wrap(<BadgeConfigView route={route} />);
    const name = (await screen.findByLabelText("Tên cấu hình")) as HTMLInputElement;
    expect(name.value).toBe("");
    expect(screen.getByRole("button", { name: "Tạo cấu hình" })).toBeEnabled();
    fireEvent.change(name, { target: { value: "Thẻ đầu tiên" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo cấu hình" }));
    await waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    expect((calls.find((call) => call.method === "POST")?.body as { name: string }).name).toBe("Thẻ đầu tiên");
  });

  it("formFromBadgeConfig keeps the loaded layout so nothing is lost on save", () => {
    const form = formFromBadgeConfig(detail);
    expect(form.frontLayout).toHaveLength(1);
    expect(form.name).toBe("Thẻ chung");
  });
});
