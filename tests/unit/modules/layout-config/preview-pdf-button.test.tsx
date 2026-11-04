import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiDownload = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiDownload: (...args: unknown[]) => apiDownload(...args),
  getApiErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Lỗi"),
  parseContentDispositionFilename: (header: string | null) => (header ? "tu-server.pdf" : null),
}));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }));

import { PreviewPdfButton } from "@/modules/layout-config/wysiwyg/preview-pdf-button";

beforeEach(() => {
  apiDownload.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() }));
});
afterEach(cleanup);

describe("PreviewPdfButton", () => {
  it("posts the current design and downloads the returned PDF", async () => {
    apiDownload.mockResolvedValue({ blob: async () => new Blob(["%PDF"]), headers: new Headers({ "content-disposition": "attachment" }) });
    render(<PreviewPdfButton buildBody={() => ({ a: 1 })} fallbackName="x.pdf" path="/certificates/config/preview-pdf" />);
    fireEvent.click(screen.getByRole("button", { name: "Xuất PDF xem trước" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(apiDownload).toHaveBeenCalledWith("/certificates/config/preview-pdf", { method: "POST", body: JSON.stringify({ a: 1 }) });
  });

  it("shows the server message when the export fails", async () => {
    apiDownload.mockRejectedValue(new Error("Thẻ 250 x 55 mm lớn hơn vùng in"));
    render(<PreviewPdfButton buildBody={() => ({})} fallbackName="x.pdf" path="/badges/config/preview-pdf" />);
    fireEvent.click(screen.getByRole("button", { name: "Xuất PDF xem trước" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Thẻ 250 x 55 mm lớn hơn vùng in"));
  });

  it("is disabled when told so", () => {
    render(<PreviewPdfButton buildBody={() => ({})} disabled fallbackName="x.pdf" path="/p" />);
    expect(screen.getByRole("button", { name: "Xuất PDF xem trước" })).toBeDisabled();
  });
});
