import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExcelJobsTray } from "@/components/common/resource/excel-jobs-tray";
import type { ExcelJob } from "@/lib/jobs/excel-jobs-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { excelJobsStore } from "@/lib/jobs/excel-jobs-store";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), loading: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

function makeJob(overrides: Partial<ExcelJob> = {}): ExcelJob {
  return { id: "job-1", kind: "EXPORT_LEADERS", label: "Xuất Excel hồ sơ huynh trưởng", importJob: false, status: "RUNNING", processed: 50, total: 200, downloadable: false, replayed: false, ...overrides };
}

function envelope(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), { status });
}

function renderTray() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <ExcelJobsTray />
    </QueryClientProvider>,
  );
  return { invalidate };
}

describe("ExcelJobsTray", () => {
  beforeEach(() => {
    useAuthStore.getState().setAccessToken("token");
    window.sessionStorage.clear();
    excelJobsStore.setState({ jobs: [] });
    Object.values(toastMock).forEach((fn) => fn.mockClear());
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("không hiện gì khi chưa có tác vụ", () => {
    renderTray();
    expect(screen.queryByLabelText("Tác vụ nền")).toBeNull();
  });

  it("hiện tiến độ của tác vụ đang chạy và cho hủy tác vụ xuất", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/cancel")) return envelope(makeJob({ status: "CANCELLED" }));
      return envelope(makeJob());
    });
    excelJobsStore.getState().track(makeJob());
    renderTray();

    expect(await screen.findByText(/25% \(50\/200\)/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");

    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(screen.getByText("Đã hủy")).toBeInTheDocument());
  });

  it("báo hoàn tất xuất với nút Tải về và tải đúng file của tác vụ", async () => {
    const done = makeJob({ status: "SUCCEEDED", processed: 200, total: 200, downloadable: true, fileName: "ho-so-huynh-truong-2026-10-23.xlsx" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/file")) return new Response("xlsx", { headers: { "content-disposition": "attachment; filename*=UTF-8''ho-so-huynh-truong-2026-10-23.xlsx" } });
      return envelope(done);
    });
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    excelJobsStore.getState().track(makeJob());
    renderTray();

    const download = await screen.findByRole("button", { name: /Tải về/ });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("hoàn tất"), expect.objectContaining({ action: expect.anything() }));
    fireEvent.click(download);
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith("/excel-jobs/job-1/file"))).toBe(true);
  });

  it("nhập xong thì làm mới danh sách và chỉ thông báo một lần", async () => {
    const done = makeJob({ id: "job-2", kind: "IMPORT_LEADERS", importJob: true, label: "Import hồ sơ huynh trưởng", status: "SUCCEEDED", created: 3, resultMessage: "Đã import 3 huynh trưởng" });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(done));
    excelJobsStore.getState().track(makeJob({ id: "job-2", kind: "IMPORT_LEADERS", importJob: true, label: "Import hồ sơ huynh trưởng", status: "QUEUED" }));
    const { invalidate } = renderTray();

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Đã import 3 huynh trưởng"));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["resource"] }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(toastMock.success).toHaveBeenCalledTimes(1);
  });

  it("nhập bị từ chối thì hiện bảng lỗi theo sheet / dòng / cột", async () => {
    const failed = makeJob({
      id: "job-3",
      kind: "IMPORT_LEADERS",
      importJob: true,
      label: "Import hồ sơ huynh trưởng",
      status: "FAILED",
      errorMessage: "File Excel có lỗi, chưa có dữ liệu nào được lưu",
      errors: [{ sheet: "Huynh trưởng", row: 3, column: "Email", message: "Email đã tồn tại trong hệ thống" }],
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(failed));
    excelJobsStore.getState().track(makeJob({ id: "job-3", kind: "IMPORT_LEADERS", importJob: true, label: "Import hồ sơ huynh trưởng", status: "RUNNING" }));
    renderTray();

    expect(await screen.findByText("Email đã tồn tại trong hệ thống")).toBeInTheDocument();
    expect(toastMock.error).toHaveBeenCalled();
    expect(screen.getByText("Huynh trưởng")).toBeInTheDocument();
  });

  it("giữ tác vụ trong sessionStorage để tải lại trang vẫn thấy", () => {
    excelJobsStore.getState().track(makeJob({ status: "SUCCEEDED", downloadable: true, fileName: "a.xlsx" }));
    expect(JSON.parse(window.sessionStorage.getItem("ht.excel-jobs") ?? "[]")[0].id).toBe("job-1");
    excelJobsStore.setState({ jobs: [] });
    renderTray();
    expect(screen.getByLabelText("Tác vụ nền")).toBeInTheDocument();
  });
});
