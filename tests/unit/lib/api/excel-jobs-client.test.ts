import { afterEach, describe, expect, it, vi } from "vitest";
import { buildExportPath, EXCEL_EXPORT_FILES } from "@/components/common/resource/excel-export-button";
import { apiMutationOnce, downloadFile } from "@/lib/api/client";
import { createExcelExportJob, createExcelImportJob, importErrorRows } from "@/lib/jobs/excel-jobs-client";
import { useAuthStore } from "@/lib/auth/auth-store";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), info: vi.fn() } }));

const job = { id: "job-1", kind: "EXPORT_LEADERS", label: "Xuất", importJob: false, status: "QUEUED", processed: 0, total: 0, downloadable: false, replayed: false };

function okEnvelope(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), { status });
}

describe("buildExportPath", () => {
  it("giữ bộ lọc, tìm kiếm, sắp xếp và bỏ phân trang", () => {
    const filters = JSON.stringify({ "course.courseCode": "ABC", status: "x" });
    const query = new URLSearchParams({ page: "3", size: "20", search: "nguyễn", sortBy: "createdAt", sortDirection: "DESC", filters }).toString();
    const [base, qs] = buildExportPath("/training/participants", query).split("?");
    expect(base).toBe("/training/participants/export");
    const params = new URLSearchParams(qs);
    expect(params.has("page")).toBe(false);
    expect(params.has("size")).toBe(false);
    expect(params.get("search")).toBe("nguyễn");
    expect(params.get("sortDirection")).toBe("DESC");
    expect(params.get("filters")).toBe(filters);
  });

  it("không có bộ lọc thì không thêm dấu hỏi thừa (xuất tất cả)", () => {
    expect(buildExportPath("/leaders", "page=0&size=10")).toBe("/leaders/export");
  });

  it("chỉ các danh sách có endpoint export ở backend mới có tên file xuất", () => {
    expect(Object.keys(EXCEL_EXPORT_FILES).sort()).toEqual(
      ["/certificates", "/deaneries", "/dioceses", "/leaders", "/parishes", "/training/courses", "/training/participants", "/training/participants/teams", "/training/participations"].sort(),
    );
  });
});

describe("importErrorRows", () => {
  it("lấy danh sách dòng lỗi từ chi tiết lỗi của API", () => {
    const rows = [{ sheet: "Sheet1", row: 3, column: "Email", message: "Email đã tồn tại" }];
    expect(importErrorRows(Object.assign(new Error("lỗi"), { details: rows }))).toEqual(rows);
    expect(importErrorRows(new Error("lỗi"))).toEqual([]);
    expect(importErrorRows(undefined)).toEqual([]);
  });
});

describe("tác vụ Excel nền", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("tạo tác vụ nhập bằng multipart kèm Idempotency-Key, không ép content-type json", async () => {
    useAuthStore.getState().setAccessToken("token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(okEnvelope({ ...job, kind: "IMPORT_LEADERS", importJob: true }, 202));

    await expect(createExcelImportJob("/leaders/import", new File(["x"], "mau.xlsx"), "key-123456789")).resolves.toMatchObject({ id: "job-1" });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/backend/api/leaders/import");
    expect(init?.method).toBe("POST");
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
    const headers = new Headers(init?.headers);
    expect(headers.get("idempotency-key")).toBe("key-123456789");
    expect(headers.has("content-type")).toBe(false);
  });

  it("tạo tác vụ xuất bằng POST không body kèm Idempotency-Key", async () => {
    useAuthStore.getState().setAccessToken("token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(okEnvelope(job, 202));

    await createExcelExportJob("/leaders/export?search=an", "key-abcdefgh");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/backend/api/leaders/export?search=an");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("idempotency-key")).toBe("key-abcdefgh");
  });

  it("giữ danh sách lỗi của backend khi nhập thất bại", async () => {
    useAuthStore.getState().setAccessToken("token");
    const errors = [{ sheet: "Sheet1", row: 2, column: "Email", message: "Bắt buộc nhập" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: "File Excel có lỗi", errorCode: "VALIDATION_ERROR", data: errors }), { status: 400 }),
    );
    const error = await createExcelImportJob("/leaders/import", new File(["x"], "mau.xlsx"), "key-123456789").catch((caught: unknown) => caught);
    expect((error as Error).message).toBe("File Excel có lỗi");
    expect(importErrorRows(error)).toEqual(errors);
  });

  it("tải file về với tên lấy từ Content-Disposition", async () => {
    useAuthStore.getState().setAccessToken("token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("abc", { headers: { "content-disposition": "attachment; filename*=UTF-8''giao-phan-2026-10-23.xlsx" } }),
    );
    const createUrl = vi.fn(() => "blob:test");
    const revokeUrl = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await expect(downloadFile("/excel-jobs/job-1/file", "giao-phan.xlsx")).resolves.toBe("giao-phan-2026-10-23.xlsx");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith("blob:test");
  });
});

describe("apiMutationOnce", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  function sentKeys(fetchMock: { mock: { calls: unknown[][] } }) {
    return fetchMock.mock.calls.map((call: unknown[]) => new Headers((call[1] as RequestInit).headers).get("idempotency-key"));
  }

  it("gửi lại đúng yêu cầu sau khi lỗi thì dùng lại cùng khóa; thành công hoặc đổi nội dung thì khóa mới", async () => {
    useAuthStore.getState().setAccessToken("token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: "Mạng lỗi" }), { status: 500 }))
      .mockResolvedValueOnce(okEnvelope({ ok: true }))
      .mockResolvedValueOnce(okEnvelope({ ok: true }))
      .mockResolvedValueOnce(okEnvelope({ ok: true }));

    await expect(apiMutationOnce("/certificates/C1/approve", "POST", { approvalReason: "a" })).rejects.toThrow("Mạng lỗi");
    await apiMutationOnce("/certificates/C1/approve", "POST", { approvalReason: "a" });
    await apiMutationOnce("/certificates/C1/approve", "POST", { approvalReason: "a" });
    await apiMutationOnce("/certificates/C1/approve", "POST", { approvalReason: "khác" });

    const keys = sentKeys(fetchMock);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
    expect(keys[3]).not.toBe(keys[2]);
  });
});
