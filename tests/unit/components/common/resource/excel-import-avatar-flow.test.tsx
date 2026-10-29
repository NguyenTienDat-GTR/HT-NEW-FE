import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { strToU8, unzipSync, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExcelImportDialog } from "@/components/common/resource/excel-import-dialog";
import { useAuthStore } from "@/lib/auth/auth-store";
import { excelJobsStore } from "@/lib/jobs/excel-jobs-store";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

// jsdom không có bộ giải mã ảnh và model nhận diện mặt: giả lập để kiểm tra luồng chọn Excel + ZIP -> xem trước -> gửi.
vi.mock("@/lib/media/face-crop", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/face-crop")>();
  return {
    ...actual,
    // anh-khong-mat.jpg không có mặt, các ảnh còn lại có một mặt ở giữa.
    detectFaces: vi.fn(async (source: { name?: string }) => (source.name === "anh-khong-mat.jpg" ? [] : [{ x: 400, y: 300, width: 200, height: 250 }])),
  };
});
vi.mock("@/lib/media/compress-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/compress-image")>();
  return { ...actual, cropPortraitToFile: vi.fn(async (_image: unknown, _rect: unknown, name: string) => new File([strToU8(`jpeg:${name}`)], name, { type: "image/jpeg" })) };
});

const job = { id: "job-1", kind: "IMPORT_LEADERS", label: "Import hồ sơ huynh trưởng", importJob: true, status: "QUEUED", processed: 0, total: 0, downloadable: false, replayed: false };

function zipOf(names: string[]) {
  const entries: Record<string, Uint8Array> = { "ghi-chu.txt": strToU8("bo qua"), "__MACOSX/a.jpg": strToU8("rac") };
  for (const name of names) entries[name] = strToU8(`goc:${name}`);
  return new File([zipSync(entries) as BlobPart], "anh.zip", { type: "application/zip" });
}

function renderDialog() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExcelImportDialog allowAvatarZip description="Mô tả" endpoint="/leaders/import" title="Import hồ sơ huynh trưởng" />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Import Excel/ }));
}

beforeEach(() => {
  useAuthStore.getState().setAccessToken("token");
  excelJobsStore.setState({ jobs: [] });
  // Mỗi ảnh giải mã ra một "bitmap" 1000x1500; tên entry đi theo bitmap để detectFaces phân biệt được ảnh.
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async (blob: Blob) => {
      const text = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));
      return { width: 1000, height: 1500, close: vi.fn(), name: text.replace("goc:", "") };
    }),
  );
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  useAuthStore.getState().clear();
});

describe("ExcelImportDialog: Excel kèm ZIP ảnh", () => {
  it("xem trước ảnh đã căn mặt, đánh dấu ảnh cần xem lại, bỏ một ảnh rồi gửi Excel cùng ZIP đã xử lý", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: job }), { status: 202 }));
    renderDialog();
    fireEvent.change(screen.getByTestId("excel-import-input"), { target: { files: [new File(["x"], "huynh-truong.xlsx")] } });
    fireEvent.change(screen.getByTestId("avatar-zip-input"), { target: { files: [zipOf(["0901234567.jpg", "thu-muc/an@x.com.png", "anh-khong-mat.jpg"])] } });

    const preview = await screen.findByTestId("avatar-zip-preview");
    // ZIP có 3 ảnh hợp lệ (bỏ .txt và __MACOSX); một ảnh không thấy mặt.
    expect(preview).toHaveTextContent("Giữ 3/3 ảnh");
    expect(preview).toHaveTextContent("1 ảnh cần xem lại");
    expect(preview).toHaveTextContent("Không thấy mặt");
    expect(preview).toHaveTextContent("Đã căn giữa mặt");

    // Bỏ ảnh không thấy mặt.
    fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh anh-khong-mat.jpg" }));
    expect(screen.getByTestId("avatar-zip-preview")).toHaveTextContent("Giữ 2/3 ảnh");

    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, init] = fetchMock.mock.calls[0] as [RequestInfo, RequestInit];
    const body = init.body as FormData;
    expect((body.get("file") as File).name).toBe("huynh-truong.xlsx");
    const images = body.get("images") as File;
    expect(images.name).toBe("anh-dai-dien.zip");
    // ZIP gửi lên giữ nguyên tên entry (khớp cột "Tên file ảnh") và chỉ có ảnh đã cắt, không còn ảnh bị bỏ.
    const sent = unzipSync(new Uint8Array(await images.arrayBuffer()));
    expect(Object.keys(sent).sort()).toEqual(["0901234567.jpg", "thu-muc/an@x.com.png"]);
    expect(new TextDecoder().decode(sent["0901234567.jpg"])).toBe("jpeg:0901234567.jpg");
    expect(excelJobsStore.getState().jobs[0].id).toBe("job-1");
  });

  it("không chọn ZIP thì chỉ gửi file Excel (ảnh là tùy chọn)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: job }), { status: 202 }));
    renderDialog();
    fireEvent.change(screen.getByTestId("excel-import-input"), { target: { files: [new File(["x"], "huynh-truong.xlsx")] } });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(body.get("file")).toBeTruthy();
    expect(body.has("images")).toBe(false);
  });

  it("bỏ hết ảnh thì không gửi ZIP nhưng vẫn import dữ liệu Excel", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: job }), { status: 202 }));
    renderDialog();
    fireEvent.change(screen.getByTestId("excel-import-input"), { target: { files: [new File(["x"], "huynh-truong.xlsx")] } });
    fireEvent.change(screen.getByTestId("avatar-zip-input"), { target: { files: [zipOf(["a.jpg"])] } });
    await screen.findByTestId("avatar-zip-preview");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh a.jpg" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(((fetchMock.mock.calls[0][1] as RequestInit).body as FormData).has("images")).toBe(false);
  });

  it("đổi ảnh (bỏ ảnh) thì dùng khóa idempotency mới", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("mất mạng"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: job }), { status: 202 }));
    renderDialog();
    fireEvent.change(screen.getByTestId("excel-import-input"), { target: { files: [new File(["x"], "huynh-truong.xlsx")] } });
    fireEvent.change(screen.getByTestId("avatar-zip-input"), { target: { files: [zipOf(["a.jpg", "b.jpg"])] } });
    await screen.findByTestId("avatar-zip-preview");
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh b.jpg" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const keyOf = (index: number) => new Headers((fetchMock.mock.calls[index][1] as RequestInit).headers).get("Idempotency-Key");
    expect(keyOf(0)).toBeTruthy();
    expect(keyOf(1)).not.toBe(keyOf(0));
  });
});
