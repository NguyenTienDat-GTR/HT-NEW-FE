import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeaderBirthDateDialog } from "@/modules/leaders/components/leader-birth-date-dialog";
import type { LeaderDetail } from "@/modules/leaders/components/leader-detail-utils";

const apiFetch = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return { ...actual, apiFetch: (...args: unknown[]) => apiFetch(...args) };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const leader = { id: "l1", holyName: "Giuse", fullName: "Nguyễn Văn A", birthDate: "2000-01-01" } as LeaderDetail;

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation((path: string, init?: { method?: string; body?: string }) => {
    if (path === "/leaders/l1/birth-date" && init?.method === "PATCH") return Promise.resolve({ ...leader, ...JSON.parse(init.body ?? "{}") });
    return Promise.reject(new Error(`unexpected ${path}`));
  });
});
afterEach(() => cleanup());

function renderDialog(onUpdated = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LeaderBirthDateDialog leader={leader} leaderId="l1" onUpdated={onUpdated} />
    </QueryClientProvider>,
  );
  return onUpdated;
}

describe("LeaderBirthDateDialog", () => {
  it("sends only the birth date to the dedicated endpoint", async () => {
    const onUpdated = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Sửa ngày sinh/ }));
    const input = await screen.findByLabelText(/Ngày sinh/);
    expect(input).toHaveValue("2000-01-01");

    fireEvent.change(input, { target: { value: "1999-05-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe("/leaders/l1/birth-date");
    expect(JSON.parse(init.body)).toEqual({ birthDate: "1999-05-20" });
  });

  it("blocks empty and future birth dates before calling the API", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Sửa ngày sinh/ }));
    const input = await screen.findByLabelText(/Ngày sinh/);

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText("Vui lòng nhập ngày sinh")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "2999-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText("Ngày sinh không được sau ngày hiện tại")).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
