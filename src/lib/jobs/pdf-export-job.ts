import { apiFetch, downloadFile } from "@/lib/api/client";
import { pollUntilDone } from "./job-runner";

type PdfJobStatus = { jobId: string; status: string; error?: string };

const PDF_POLL_INTERVAL_MS = 1500;
const PDF_POLL_MAX_ATTEMPTS = 200;

/**
 * Xuất PDF chạy nền: tạo job, hỏi trạng thái định kỳ rồi tải file về máy khi xong
 * (không treo request dù xuất vài trăm chứng nhận). Trả về tên file đã tải.
 */
export async function runPdfExportJob(basePath: string, certificateCodes: string[], options: { intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {}) {
  const submit = await apiFetch<PdfJobStatus>(`${basePath}/jobs`, {
    method: "POST",
    body: JSON.stringify({ certificateCodes }),
  });
  const done = await pollUntilDone<PdfJobStatus>(
    submit,
    async () => ({ ...submit, ...(await apiFetch<Partial<PdfJobStatus> & { status: string }>(`${basePath}/jobs/${encodeURIComponent(submit.jobId)}`)) }),
    { intervalMs: options.intervalMs ?? PDF_POLL_INTERVAL_MS, maxAttempts: PDF_POLL_MAX_ATTEMPTS, sleep: options.sleep },
  );
  if (done.status !== "DONE") throw new Error(done.error || "Quá thời gian tạo PDF, vui lòng thử lại");
  return downloadFile(`${basePath}/jobs/${encodeURIComponent(submit.jobId)}/file`, "chung-nhan.pdf");
}
