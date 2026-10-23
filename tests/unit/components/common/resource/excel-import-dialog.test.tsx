import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalDialog } from "@/components/common/resource/approval-dialog";
import { ExcelImportDialog } from "@/components/common/resource/excel-import-dialog";
import { useAuthStore } from "@/lib/auth/auth-store";
import { excelJobsStore } from "@/lib/jobs/excel-jobs-store";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), loading: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

const job = { id: "job-9", kind: "IMPORT_LEADERS", label: "Import hồ sơ huynh trưởng", importJob: true, status: "QUEUED", processed: 0, total: 0, downloadable: false, replayed: false };

function renderImport() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExcelImportDialog description="Mô tả" endpoint="/leaders/import" title="Import hồ sơ huynh trưởng" />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Import Excel/ }));
}

function pickFile(name: string) {
  const input = screen.getByTestId("excel-import-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(["x"], name)] } });
}

describe("ExcelImportDialog (tác vụ nền)", () => {
  beforeEach(() => {
    useAuthStore.getState().setAccessToken("token");
    excelJobsStore.setState({ jobs: [] });
    Object.values(toastMock).forEach((fn) => fn.mockClear());
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("chỉ nhận file .xlsx và chỉ bật nút Import khi đã chọn file hợp lệ", () => {
    renderImport();
    const submit = screen.getByRole("button", { name: "Import" });
    expect(submit).toBeDisabled();

    pickFile("du-lieu.csv");
    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ hỗ trợ file Excel định dạng .xlsx");
    expect(submit).toBeDisabled();

    pickFile("mau.xlsx");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(submit).toBeEnabled();
  });

  it("gửi file kèm Idempotency-Key, theo dõi tác vụ ở khay và đóng hộp thoại ngay (không chờ import xong)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { ...job, warning: "File này đã được import thành công lúc 10:00 01/01/2026." } }), { status: 202 }));
    renderImport();
    pickFile("mau.xlsx");
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(excelJobsStore.getState().jobs.map((item) => item.id)).toEqual(["job-9"]));
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/backend/api/leaders/import");
    expect(new Headers(init?.headers).get("idempotency-key")).toBeTruthy();
    expect(toastMock.warning).toHaveBeenCalledWith(expect.stringContaining("đã được import"), expect.anything());
    await waitFor(() => expect(screen.queryByTestId("excel-import-input")).toBeNull());
  });

  it("thử lại cùng file sau lỗi mạng dùng lại cùng khóa idempotency", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: "Đang có một tác vụ cùng loại đang chạy" }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: job }), { status: 202 }));
    renderImport();
    pickFile("mau.xlsx");
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await screen.findByText("Đang có một tác vụ cùng loại đang chạy");
    expect(excelJobsStore.getState().jobs).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(excelJobsStore.getState().jobs).toHaveLength(1));

    const keys = fetchMock.mock.calls.map((call) => new Headers((call[1] as RequestInit).headers).get("idempotency-key"));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });
});

describe("ExcelImportDialog - file mẫu", () => {
  beforeEach(() => {
    useAuthStore.getState().setAccessToken("token");
    excelJobsStore.setState({ jobs: [] });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("có nút tải file mẫu cùng với phần tải file lên, và tải đúng endpoint mẫu", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("xlsx", { headers: { "content-disposition": "attachment; filename*=UTF-8''mau-import-ho-so-huynh-truong-2026-10-23.xlsx" } }),
    );
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:t"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ExcelImportDialog description="Mô tả" endpoint="/leaders/import" templatePath="/leaders/import-template" title="Import hồ sơ huynh trưởng" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Import Excel/ }));

    // Hai chức năng cùng hiện: tải file mẫu và tải file lên.
    expect(screen.getByTestId("excel-import-input")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Tải file mẫu/ }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/backend/api/leaders/import-template");
    // Tải mẫu không tạo tác vụ import.
    expect(excelJobsStore.getState().jobs).toHaveLength(0);
  });

  it("không hiện nút file mẫu khi không có endpoint mẫu", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ExcelImportDialog description="Mô tả" endpoint="/leaders/import" title="Import" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Import Excel/ }));
    expect(screen.queryByRole("button", { name: /Tải file mẫu/ })).toBeNull();
  });
});

describe("ApprovalDialog với khóa quá khứ", () => {
  afterEach(() => cleanup());

  it("bắt buộc chọn ngày duyệt (không quá hôm nay) và gửi kèm người ký", () => {
    const onConfirm = vi.fn();
    render(<ApprovalDialog captureSigner onClose={() => undefined} onConfirm={onConfirm} open requireApprovalDate />);

    const approve = screen.getByRole("button", { name: "Duyệt" });
    fireEvent.change(screen.getByPlaceholderText("Tên người ký"), { target: { value: "Cha Giuse" } });
    expect(approve).toBeDisabled();

    const dateInput = screen.getByTestId("approval-date-input") as HTMLInputElement;
    expect(dateInput.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.change(dateInput, { target: { value: "2999-01-01" } });
    expect(approve).toBeDisabled();

    fireEvent.change(dateInput, { target: { value: "2019-12-20" } });
    expect(approve).toBeEnabled();
    fireEvent.click(approve);
    expect(onConfirm).toHaveBeenCalledWith("", undefined, { signerType: "CHAPLAIN", signerName: "Cha Giuse", signerTitle: "Linh mục tuyên úy", approvalDate: "2019-12-20" }, undefined);
  });

  it("khóa thường không hiện ô ngày duyệt và không gửi ngày", () => {
    const onConfirm = vi.fn();
    render(<ApprovalDialog captureSigner onClose={() => undefined} onConfirm={onConfirm} open />);
    expect(screen.queryByTestId("approval-date-input")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Tên người ký"), { target: { value: "Cha Giuse" } });
    fireEvent.click(screen.getByRole("button", { name: "Duyệt" }));
    expect(onConfirm).toHaveBeenCalledWith("", undefined, { signerType: "CHAPLAIN", signerName: "Cha Giuse", signerTitle: "Linh mục tuyên úy", approvalDate: undefined }, undefined);
  });
});
