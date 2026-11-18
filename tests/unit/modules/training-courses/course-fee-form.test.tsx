import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormField } from "@/components/form/resource-form/form-controls";
import { feeAmountError, trainingFormSpecs } from "@/modules/training-courses/form-specs";

const courseSpec = trainingFormSpecs.find((spec) => spec.kind === "courses")!;
const feeEnabledField = courseSpec.fields.find((field) => field.name === "feeEnabled")!;
const feeAmountField = courseSpec.fields.find((field) => field.name === "feeAmount")!;

afterEach(cleanup);

function renderField(props: Partial<React.ComponentProps<typeof FormField>> & Pick<React.ComponentProps<typeof FormField>, "field">) {
  return render(
    <Tooltip.Provider>
      <QueryClientProvider client={new QueryClient()}>
        <FormField mode="edit" onChange={() => undefined} value="" {...props} />
      </QueryClientProvider>
    </Tooltip.Provider>,
  );
}

describe("form khóa huấn luyện: lệ phí", () => {
  it("có mục Lệ phí gồm công tắc thu lệ phí và ô lệ phí mỗi người (tiền VND)", () => {
    expect(courseSpec.fields.filter((field) => field.section === "Lệ phí").map((field) => [field.name, field.type])).toEqual([
      ["feeEnabled", "switch"],
      ["feeAmount", "money"],
    ]);
  });

  it("mặc định khi tạo khóa là không thu lệ phí", () => {
    expect(courseSpec.getInitialValues?.(null)).toMatchObject({ feeEnabled: false });
  });

  it("ô lệ phí chỉ hiện và bắt buộc khi bật thu lệ phí", () => {
    expect(feeAmountField.visibleWhen?.({ feeEnabled: true }, "create")).toBe(true);
    expect(feeAmountField.visibleWhen?.({ feeEnabled: false }, "create")).toBe(false);
    expect(feeAmountField.visibleWhen?.({}, "create")).toBe(false);
    expect(feeAmountField.requiredWhen?.({ feeEnabled: true }, "create")).toBe(true);
    expect(feeAmountField.requiredWhen?.({ feeEnabled: false }, "create")).toBe(false);
  });

  it("lệ phí phải là số nguyên đồng lớn hơn 0 và không vượt 999.999.999", () => {
    const on = { feeEnabled: true };
    expect(feeAmountError(150000, on)).toBeUndefined();
    expect(feeAmountError(1, on)).toBeUndefined();
    expect(feeAmountError(999_999_999, on)).toBeUndefined();
    expect(feeAmountError(0, on)).toBe("Lệ phí mỗi người phải lớn hơn 0 đồng");
    expect(feeAmountError(-5, on)).toBe("Lệ phí mỗi người phải lớn hơn 0 đồng");
    expect(feeAmountError(1.5, on)).toBe("Lệ phí mỗi người phải lớn hơn 0 đồng");
    expect(feeAmountError(1_000_000_000, on)).toBe("Lệ phí mỗi người không được vượt quá 999.999.999 đồng");
    // Để trống thì quy tắc bắt buộc xử lý; tắt thu lệ phí thì không kiểm tra.
    expect(feeAmountError("", on)).toBeUndefined();
    expect(feeAmountError(undefined, on)).toBeUndefined();
    expect(feeAmountError(0, { feeEnabled: false })).toBeUndefined();
    expect(feeAmountField.validate?.(0, on)).toBe("Lệ phí mỗi người phải lớn hơn 0 đồng");
  });

  it("khóa lệ phí khi khóa đã có hồ sơ được duyệt đăng ký (chỉ khi sửa) và nói rõ lý do", () => {
    expect(feeEnabledField.readOnlyWhen?.({ feeLocked: true }, "edit")).toBe(true);
    expect(feeAmountField.readOnlyWhen?.({ feeLocked: true }, "edit")).toBe(true);
    expect(feeEnabledField.readOnlyWhen?.({ feeLocked: false }, "edit")).toBe(false);
    expect(feeEnabledField.readOnlyWhen?.({ feeLocked: true }, "create")).toBe(false);
    expect(feeEnabledField.note?.({ feeLocked: true }, "edit")).toBe("Khóa đã có hồ sơ được duyệt đăng ký nên không thể sửa lệ phí.");
    expect(feeEnabledField.note?.({ feeLocked: false }, "edit")).toBeUndefined();
    expect(feeEnabledField.note?.({ feeLocked: true }, "create")).toBeUndefined();
  });

  it("gửi cờ và số tiền khi bật; chỉ gửi cờ tắt (không số tiền) khi tắt", () => {
    const on = courseSpec.mapSubmit!({ courseName: "Khóa", feeEnabled: true, feeAmount: 150000 }, "create");
    expect(on).toMatchObject({ feeEnabled: true, feeAmount: 150000 });
    const off = courseSpec.mapSubmit!({ courseName: "Khóa", feeEnabled: false }, "edit");
    expect(off.feeEnabled).toBe(false);
    expect("feeAmount" in off).toBe(false);
  });
});

describe("FormField: kiểu tiền và ghi chú khóa", () => {
  it("ô tiền hiện định dạng VND, đọc bằng chữ và báo số nguyên khi gõ", () => {
    let latest: unknown = null;
    renderField({ field: feeAmountField, value: 150000, onChange: (value) => (latest = value) });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("150.000");
    expect(screen.getByText("Một trăm năm mươi nghìn đồng")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "1.200.000" } });
    expect(latest).toBe(1200000);
    fireEvent.change(input, { target: { value: "" } });
    expect(latest).toBe("");
  });

  it("khóa lệ phí thì ô tiền không sửa được và công tắc hiện dòng giải thích", () => {
    renderField({ field: { ...feeAmountField, readOnlyOnEdit: true }, value: 150000, values: { feeEnabled: true, feeLocked: true } });
    expect(screen.getByRole("textbox")).toBeDisabled();
    cleanup();

    renderField({ field: { ...feeEnabledField, readOnlyOnEdit: true }, value: true, values: { feeEnabled: true, feeLocked: true } });
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByText("Khóa đã có hồ sơ được duyệt đăng ký nên không thể sửa lệ phí.")).toBeInTheDocument();
  });
});
