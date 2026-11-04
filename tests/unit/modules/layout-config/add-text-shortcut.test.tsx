import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCanvas } from "@/modules/certificates/components/certificate-canvas";
import type { LayoutItem } from "@/modules/certificates/components/certificate-design";
import { AddElementBar } from "@/modules/layout-config/wysiwyg/add-element-bar";
import { CERTIFICATE_TEMPLATES } from "@/modules/layout-config/wysiwyg/layout-templates";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(cleanup);

const text = (patch: Partial<LayoutItem> = {}): LayoutItem => ({ type: "TEXT", text: "Văn bản", x: 0.5, y: 0.5, fontSize: 0.04, color: "#000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false, ...patch });

function canvas(extra: Partial<React.ComponentProps<typeof CertificateCanvas>> = {}) {
  return render(
    <CertificateCanvas aspect={1.4} backgroundImage="" editable fieldLabel={(k) => k ?? ""} layout={[]} onAddTextAt={() => undefined} onLayoutChange={() => undefined} onSelectionChange={() => undefined} preview={false} sampleValue={() => ""} selection={[]} {...extra} />,
  );
}

describe("T shortcut", () => {
  it("adds a text at the page centre when the pointer is not over the page", () => {
    const onAddTextAt = vi.fn();
    canvas({ onAddTextAt });
    fireEvent.keyDown(window, { key: "t" });
    expect(onAddTextAt).toHaveBeenCalledWith(0.5, 0.5);
  });

  it("ignores T while typing in a field, with modifiers, in a dialog, or when not editable", () => {
    const onAddTextAt = vi.fn();
    const { rerender } = canvas({ onAddTextAt });
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "t" });
    fireEvent.keyDown(window, { key: "t", ctrlKey: true });
    fireEvent.keyDown(window, { key: "T", shiftKey: true });
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    fireEvent.keyDown(window, { key: "t" });
    dialog.remove();
    input.remove();
    expect(onAddTextAt).not.toHaveBeenCalled();
    rerender(
      <CertificateCanvas aspect={1.4} backgroundImage="" editable={false} fieldLabel={(k) => k ?? ""} layout={[]} onAddTextAt={onAddTextAt} onLayoutChange={() => undefined} preview={false} sampleValue={() => ""} />,
    );
    fireEvent.keyDown(window, { key: "t" });
    expect(onAddTextAt).not.toHaveBeenCalled();
  });

  it("starts inline editing of the text that was just added", () => {
    const onAddTextAt = vi.fn();
    const { rerender, container } = canvas({ onAddTextAt, layout: [] });
    fireEvent.keyDown(window, { key: "t" });
    rerender(
      <CertificateCanvas aspect={1.4} backgroundImage="" editable fieldLabel={(k) => k ?? ""} layout={[text()]} onAddTextAt={onAddTextAt} onLayoutChange={() => undefined} onSelectionChange={() => undefined} preview={false} sampleValue={() => ""} selection={[0]} />,
    );
    const item = container.querySelector('[data-idx="0"]') as HTMLElement;
    expect(item.getAttribute("contenteditable")).toBe("true");
  });
});

describe("add element buttons", () => {
  function bar() {
    render(
      <TooltipProvider delayDuration={0}>
        <AddElementBar hasContent={false} onAddPhoto={() => undefined} onAddQr={() => undefined} onAddText={() => undefined} onApplyTemplate={() => undefined} photoHint="Gợi ý ảnh" qrHint="Gợi ý QR" templates={CERTIFICATE_TEMPLATES} />
      </TooltipProvider>,
    );
  }

  it.each([
    ["Thêm văn bản", /phím T/],
    ["Thêm ảnh huynh trưởng", /Gợi ý ảnh/],
    ["Thêm mã QR", /Gợi ý QR/],
    ["Mẫu bố cục", /Chọn mẫu bố cục dựng sẵn/],
  ])("%s shows a tooltip on hover", async (name, tip) => {
    const user = userEvent.setup();
    bar();
    await user.hover(screen.getByRole("button", { name }));
    expect((await screen.findAllByText(tip))[0]).toBeInTheDocument();
  });
});
