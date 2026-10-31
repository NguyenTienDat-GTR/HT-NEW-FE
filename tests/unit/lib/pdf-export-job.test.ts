import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
const downloadFile = vi.fn();
vi.mock("@/lib/api/client", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args), downloadFile: (...args: unknown[]) => downloadFile(...args) }));

import { runPdfExportJob } from "@/lib/jobs/pdf-export-job";

const noWait = { sleep: () => Promise.resolve() };

describe("runPdfExportJob", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    downloadFile.mockReset();
  });

  it("creates the job, polls until DONE, then downloads the file", async () => {
    apiFetch
      .mockResolvedValueOnce({ jobId: "j/1", status: "PENDING" })
      .mockResolvedValueOnce({ status: "PENDING" })
      .mockResolvedValueOnce({ status: "DONE" });
    downloadFile.mockResolvedValue("chung-nhan-1.pdf");

    const filename = await runPdfExportJob("/certificates/export", ["C1", "C2"], noWait);

    expect(filename).toBe("chung-nhan-1.pdf");
    expect(apiFetch).toHaveBeenNthCalledWith(1, "/certificates/export/jobs", { method: "POST", body: JSON.stringify({ certificateCodes: ["C1", "C2"] }) });
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/certificates/export/jobs/j%2F1");
    expect(downloadFile).toHaveBeenCalledWith("/certificates/export/jobs/j%2F1/file", "chung-nhan.pdf");
  });

  it("surfaces the server error when the job fails and never downloads", async () => {
    apiFetch.mockResolvedValueOnce({ jobId: "j1", status: "PENDING" }).mockResolvedValueOnce({ status: "FAILED", error: "Không đủ bộ nhớ" });

    await expect(runPdfExportJob("/certificates/export", ["C1"], noWait)).rejects.toThrow("Không đủ bộ nhớ");
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it("skips polling when the job is already done", async () => {
    apiFetch.mockResolvedValueOnce({ jobId: "j2", status: "DONE" });
    downloadFile.mockResolvedValue("a.pdf");

    await runPdfExportJob("/x", ["C1"], noWait);

    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
