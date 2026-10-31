import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormField } from "@/components/form/resource-form/form-controls";
import type { FormFieldSpec } from "@/components/form/resource-form/types";

function renderField(field: Partial<FormFieldSpec> & { name: string; label: string }, value: unknown, onChange = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FormField field={field as FormFieldSpec} mode="create" onChange={onChange} value={value as never} />
    </QueryClientProvider>,
  );
  return onChange;
}

afterEach(cleanup);

describe("FormField control registry", () => {
  it("renders a textarea for type textarea and reports typing", () => {
    const onChange = renderField({ name: "note", label: "Ghi chú", type: "textarea" }, "a");
    const box = screen.getByLabelText("Ghi chú") as HTMLTextAreaElement;
    expect(box.tagName).toBe("TEXTAREA");
    fireEvent.change(box, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("renders a switch that toggles its boolean value", () => {
    const onChange = renderField({ name: "primary", label: "Vai trò", type: "switch", switchLabels: ["Chính", "Phụ"] }, false);
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(toggle.textContent).toContain("Phụ");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("falls back to a plain input for unknown types and converts numbers", () => {
    const onChange = renderField({ name: "age", label: "Tuổi", type: "number" }, "5");
    const input = screen.getByLabelText("Tuổi") as HTMLInputElement;
    expect(input.type).toBe("number");
    fireEvent.change(input, { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("uses a plain input for a registration-list field without configuration", () => {
    renderField({ name: "entries", label: "Danh sách", type: "registration-list" }, "");
    expect((screen.getByLabelText("Danh sách") as HTMLInputElement).tagName).toBe("INPUT");
  });
});
