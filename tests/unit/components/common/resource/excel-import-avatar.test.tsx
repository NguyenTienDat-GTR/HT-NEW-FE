import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExcelImportDialog } from "@/components/common/resource/excel-import-dialog";
import type { ExcelJob } from "@/lib/jobs/excel-jobs-client";
import { isAvatarPending, needsPolling } from "@/lib/jobs/excel-jobs-store";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

function renderImport(allowAvatarZip: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExcelImportDialog allowAvatarZip={allowAvatarZip} description="Mô tả" endpoint="/leaders/import" title="Import hồ sơ huynh trưởng" />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Import Excel/ }));
}

const baseJob: ExcelJob = { id: "j", kind: "IMPORT_LEADERS", label: "x", importJob: true, status: "SUCCEEDED", processed: 1, total: 1, downloadable: false, replayed: false };

describe("ExcelImportDialog (ZIP ảnh đại diện)", () => {
  afterEach(cleanup);

  it("chỉ hiện ô chọn ZIP khi bật allowAvatarZip", () => {
    renderImport(false);
    expect(screen.queryByTestId("avatar-zip-input")).toBeNull();
    cleanup();
    renderImport(true);
    expect(screen.getByTestId("avatar-zip-input")).toBeInTheDocument();
    expect(screen.getByText(/người ở giữa ảnh/)).toBeInTheDocument();
  });

  it("báo lỗi khi file không phải .zip", async () => {
    renderImport(true);
    fireEvent.change(screen.getByTestId("avatar-zip-input"), { target: { files: [new File(["x"], "anh.rar")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Ảnh phải được nén thành file .zip");
  });

  it("báo lỗi khi ZIP không có ảnh hợp lệ", async () => {
    renderImport(true);
    const zip = zipSync({ "ghi-chu.txt": strToU8("khong phai anh") });
    fireEvent.change(screen.getByTestId("avatar-zip-input"), { target: { files: [new File([zip as BlobPart], "anh.zip", { type: "application/zip" })] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("ZIP không có ảnh JPG, PNG hoặc WebP"));
  });
});

describe("theo dõi ảnh đại diện của tác vụ nền", () => {
  it("tiếp tục poll khi dữ liệu đã lưu nhưng ảnh chưa gắn xong", () => {
    expect(needsPolling({ ...baseJob, status: "SUCCEEDED", avatarStatus: "PENDING" })).toBe(true);
    expect(needsPolling({ ...baseJob, status: "SUCCEEDED", avatarStatus: "RUNNING" })).toBe(true);
    expect(isAvatarPending({ ...baseJob, avatarStatus: "RUNNING" })).toBe(true);
  });

  it("dừng poll khi job xong và ảnh DONE hoặc không có ảnh", () => {
    expect(needsPolling({ ...baseJob, avatarStatus: "DONE" })).toBe(false);
    expect(needsPolling({ ...baseJob, avatarStatus: null })).toBe(false);
    expect(needsPolling({ ...baseJob, status: "RUNNING" })).toBe(true);
  });
});
