import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrationListField } from "@/components/form/resource-form/registration-list-field";
import { useAuthStore } from "@/lib/auth/auth-store";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function page(content: unknown[]) {
  return new Response(JSON.stringify({ success: true, data: { content, totalElements: content.length, totalPages: content.length ? 1 : 0, size: 10, number: 0, first: true, last: true } }));
}

describe("lọc ứng viên theo cấp huynh trưởng", () => {
  beforeEach(() => {
    useAuthStore.getState().setAccessToken("token");
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("chọn cấp độ thì gửi tham số leaderLevel; chọn lại 'Tất cả' thì bỏ tham số", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
      return page([]);
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RegistrationListField courseCode="C1" mode="standard" onChange={() => undefined} otherEntries={[]} value={[]} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Lập danh sách/ }));

    const select = await screen.findByLabelText("Lọc theo cấp huynh trưởng");
    await waitFor(() => expect(urls.some((url) => url.includes("/registration-candidates"))).toBe(true));
    expect(urls.filter((url) => url.includes("/registration-candidates")).every((url) => !url.includes("leaderLevel"))).toBe(true);

    fireEvent.change(select, { target: { value: "HT_I" } });
    await waitFor(() => expect(urls.some((url) => url.includes("/registration-candidates") && url.includes("leaderLevel=HT_I"))).toBe(true));

    const before = urls.length;
    fireEvent.change(select, { target: { value: "" } });
    await waitFor(() => expect(urls.slice(before).some((url) => url.includes("/registration-candidates") && !url.includes("leaderLevel"))).toBe(true));
  });

  it("danh sách cấp độ gồm cả 'Chưa có cấp' để lọc huynh trưởng chưa có cấp", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => page([]));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RegistrationListField courseCode="C1" mode="exception" onChange={() => undefined} otherEntries={[]} value={[]} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Thêm ngoại lệ/ }));
    const select = await screen.findByLabelText("Lọc theo cấp huynh trưởng");
    const labels = Array.from(select.querySelectorAll("option")).map((option) => option.textContent);
    expect(labels).toContain("Tất cả cấp độ");
    expect(labels).toContain("Chưa có cấp");
    expect(labels).toContain("Huynh trưởng cấp I");
  });
});
