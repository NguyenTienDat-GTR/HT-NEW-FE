import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormField } from "@/components/form/resource-form/form-controls";
import { getFormSpec } from "@/components/form/resource-form/registry";
import { matchRoute } from "@/config/routes/routes";
import { useAuthStore } from "@/lib/auth/auth-store";

function renderField(props: { value: string; currentLabel?: string; options: { courseCode: string; courseName: string }[] }) {
  const route = matchRoute("/training/registrations/new")!.route;
  const spec = getFormSpec(route, "create", null)!;
  const field = { ...spec.fields.find((item) => item.name === "courseCode")!, currentLabel: props.currentLabel };
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ success: true, data: props.options })));
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FormField field={field} mode="create" onChange={() => undefined} value={props.value} />
    </QueryClientProvider>,
  );
}

describe("khóa trong form gửi đăng ký", () => {
  beforeEach(() => {
    useAuthStore.getState().setAccessToken("token");
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("khóa đã chọn sẵn từ tab của khóa thì bị khóa không đổi được", async () => {
    renderField({ value: "C1", currentLabel: "Khóa HT cấp I 2026", options: [{ courseCode: "C1", courseName: "Khóa HT cấp I 2026" }, { courseCode: "C2", courseName: "Khóa khác" }] });
    const control = await screen.findByRole("combobox");
    await waitFor(() => expect(control).toBeDisabled());
  });

  it("hiện tên khóa thay vì mã, kể cả khi khóa không nằm trong danh sách khóa đang mở đăng ký", async () => {
    renderField({ value: "e6b7c2f0-aaaa-bbbb-cccc-123456789012", currentLabel: "Khóa HT cấp I 2026", options: [{ courseCode: "C2", courseName: "Khóa khác" }] });
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("Khóa HT cấp I 2026"));
    expect(screen.getByRole("combobox")).not.toHaveTextContent("e6b7c2f0");
  });

  it("chưa có khóa chọn sẵn (mở trực tiếp) thì vẫn chọn được khóa", async () => {
    renderField({ value: "", options: [{ courseCode: "C1", courseName: "Khóa HT cấp I 2026" }] });
    const control = await screen.findByRole("combobox");
    await waitFor(() => expect(control).not.toBeDisabled());
  });
});
