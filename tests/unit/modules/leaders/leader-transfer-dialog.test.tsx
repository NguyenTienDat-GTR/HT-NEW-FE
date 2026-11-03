import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeaderTransferDialog } from "@/modules/leaders/components/leader-transfer-dialog";
import type { LeaderDetail } from "@/modules/leaders/components/leader-detail-utils";

const apiFetch = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return { ...actual, apiFetch: (...args: unknown[]) => apiFetch(...args) };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const leader = { id: "l1", holyName: "Giuse", fullName: "Nguyễn Văn A", parishId: "p1", parishName: "Phú Cường" } as LeaderDetail;

const parishPage = {
  content: [
    { id: "p1", name: "Phú Cường", unitTypeLabel: "Giáo xứ", deaneryName: "Thủ Dầu Một" },
    { id: "p2", name: "Bà Lụa", unitTypeLabel: "Giáo họ", parentParishName: "Phú Cường", deaneryName: "Thủ Dầu Một" },
  ],
  totalPages: 2,
};
const deaneryPage = { content: [{ id: "d1", name: "Thủ Dầu Một" }, { id: "d2", name: "Dĩ An" }] };

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation((path: string, init?: { method?: string }) => {
    if (path.startsWith("/deaneries")) return Promise.resolve(deaneryPage);
    if (path.startsWith("/parishes")) return Promise.resolve(parishPage);
    if (path.includes("/transfer") && init?.method === "POST") return Promise.resolve({ ...leader, parishId: "p2", parishName: "Bà Lụa" });
    return Promise.reject(new Error(`unexpected ${path}`));
  });
});
afterEach(() => cleanup());

function renderDialog(onTransferred = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LeaderTransferDialog endpoint="/leaders" leader={leader} leaderId="l1" onTransferred={onTransferred} />
    </QueryClientProvider>,
  );
  return onTransferred;
}

describe("LeaderTransferDialog", () => {
  it("lists parishes in a table with deanery filter and pagination, and blocks the current unit", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Chuyển xứ/ }));

    expect(await screen.findByText("Giáo họ Bà Lụa")).toBeInTheDocument();
    expect(screen.getByLabelText("Lọc theo giáo hạt")).toBeInTheDocument();
    expect(screen.getByText("Trang 1/2")).toBeInTheDocument();
    expect(screen.getByLabelText("Chọn Phú Cường")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Chuyển" })).toBeDisabled();
  });

  it("sends the chosen unit to the dedicated transfer endpoint", async () => {
    const onTransferred = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Chuyển xứ/ }));
    fireEvent.click(await screen.findByLabelText("Chọn Bà Lụa"));
    fireEvent.click(screen.getByRole("button", { name: "Chuyển" }));

    await waitFor(() => expect(onTransferred).toHaveBeenCalled());
    const call = apiFetch.mock.calls.find(([path]) => String(path).includes("/transfer"));
    expect(call?.[0]).toBe("/leaders/l1/transfer");
    expect(JSON.parse(call?.[1].body)).toEqual({ parishId: "p2" });
  });
});
