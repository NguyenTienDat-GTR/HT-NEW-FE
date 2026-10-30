"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CaretDown, CaretUp, CheckCircle, DownloadSimple, FileXls, Warning, X, XCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { cancelExcelJob, downloadExcelJobFile, fetchExcelJob, type ExcelJob } from "@/lib/jobs/excel-jobs-client";
import { excelJobsStore, isActiveJob, isAvatarPending, needsPolling, restoreExcelJobs, useExcelJobs } from "@/lib/jobs/excel-jobs-store";
import { cn } from "@/lib/utils";
import { AvatarWarningsList } from "./avatar-warnings-list";
import { ImportErrorsTable } from "./import-errors-table";
import { resourceKey } from "@/lib/api/query-keys";

const POLL_MS = 2500;

const statusLabels: Record<ExcelJob["status"], string> = {
  QUEUED: "Đang chờ",
  RUNNING: "Đang xử lý",
  SUCCEEDED: "Hoàn tất",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};

// Khay tác vụ Excel nền (xuất / nhập): nằm ở khung ứng dụng nên người dùng chuyển trang và làm việc khác thoải mái trong lúc chờ.
export function ExcelJobsTray() {
  const jobs = useExcelJobs();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [openErrors, setOpenErrors] = useState<string | null>(null);
  const [openAvatarWarnings, setOpenAvatarWarnings] = useState<string | null>(null);
  // Trạng thái đã thông báo cho từng job, để mỗi kết quả chỉ báo một lần dù poll nhiều lần hay tải lại trang.
  const notified = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    restoreExcelJobs();
  }, []);

  const anyActive = jobs.some(needsPolling);

  useEffect(() => {
    if (!anyActive) return;
    let stopped = false;
    const tick = async () => {
      for (const job of excelJobsStore.getState().jobs.filter(needsPolling)) {
        try {
          const next = await fetchExcelJob(job.id);
          if (stopped) return;
          excelJobsStore.getState().update(next);
          await announce(next);
        } catch (error) {
          // Tác vụ đã bị dọn (quá hạn giữ) hoặc không còn: bỏ khỏi khay.
          if ((error as { status?: number }).status === 404) excelJobsStore.getState().dismiss(job.id);
        }
      }
    };
    const timer = window.setInterval(tick, POLL_MS);
    void tick();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyActive]);

  async function announce(job: ExcelJob) {
    // Khóa gồm cả trạng thái ảnh: import xong dữ liệu báo một lần, ảnh gắn xong báo thêm một lần.
    const key = `${job.status}|${job.avatarStatus ?? ""}`;
    const previous = notified.current.get(job.id);
    if (previous === key) return;
    if (!["SUCCEEDED", "FAILED", "CANCELLED"].includes(job.status)) return;
    notified.current.set(job.id, key);
    if (job.status === "SUCCEEDED") {
      if (job.importJob) {
        if (previous === undefined) toast.success(job.resultMessage ?? `${job.label} hoàn tất`);
        if (job.avatarStatus === "DONE") announceAvatars(job);
        // Dữ liệu đã đổi: làm mới các danh sách / chi tiết đang mở.
        await queryClient.invalidateQueries({ queryKey: resourceKey() });
        await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
      } else {
        toast.success(`${job.label} hoàn tất`, {
          duration: 15000,
          action: { label: "Tải về", onClick: () => void download(job) },
        });
      }
    } else if (job.status === "FAILED") {
      toast.error(job.errorMessage ?? `${job.label} thất bại`, { duration: 12000 });
      if (job.importJob && job.errors?.length) setOpenErrors(job.id);
    }
  }

  function announceAvatars(job: ExcelJob) {
    const failed = job.avatarWarnings?.length ?? 0;
    const succeeded = job.avatarSucceeded ?? 0;
    if (failed > 0) {
      toast.warning(`Đã gắn ${succeeded} ảnh, ${failed} hồ sơ không có ảnh. Xem chi tiết ở khay tác vụ.`, { duration: 15000 });
      setOpenAvatarWarnings(job.id);
    } else if (succeeded > 0) {
      toast.success(`Đã gắn ${succeeded} ảnh đại diện`);
    }
  }

  async function download(job: ExcelJob) {
    try {
      await downloadExcelJobFile(job.id, job.fileName ?? "ket-qua.xlsx");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function cancel(job: ExcelJob) {
    try {
      excelJobsStore.getState().update(await cancelExcelJob(job.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  if (jobs.length === 0) return null;

  return (
    <aside aria-label="Tác vụ nền" className="fixed bottom-4 right-4 z-30 w-[min(92vw,360px)] rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)]">
      <button
        aria-expanded={!collapsed}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground"
        onClick={() => setCollapsed((value) => !value)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <FileXls className="text-success" size={18} />
          Tác vụ Excel{anyActive ? " (đang chạy)" : ""}
        </span>
        {collapsed ? <CaretUp size={16} /> : <CaretDown size={16} />}
      </button>
      {collapsed ? null : (
        <ul className="max-h-[60vh] divide-y divide-border overflow-auto border-t border-border">
          {jobs.map((job) => {
            const active = isActiveJob(job);
            const percent = job.total > 0 ? Math.min(100, Math.round((job.processed / job.total) * 100)) : null;
            return (
              <li className="space-y-2 px-4 py-3" data-testid={`excel-job-${job.id}`} key={job.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{job.label}</p>
                    <p className={cn("text-xs", job.status === "FAILED" ? "text-danger" : job.status === "SUCCEEDED" ? "text-success" : "text-muted")}>
                      {job.status === "SUCCEEDED" ? <CheckCircle className="mr-1 inline" size={14} weight="fill" /> : null}
                      {job.status === "FAILED" ? <XCircle className="mr-1 inline" size={14} weight="fill" /> : null}
                      {statusLabels[job.status]}
                      {active && percent !== null ? ` · ${percent}% (${job.processed}/${job.total})` : ""}
                    </p>
                  </div>
                  {active ? null : (
                    <Button aria-label="Bỏ khỏi khay" onClick={() => excelJobsStore.getState().dismiss(job.id)} size="icon" type="button" variant="ghost">
                      <X size={16} />
                    </Button>
                  )}
                </div>
                {active ? (
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={percent ?? undefined} aria-valuemin={0} aria-valuemax={100}>
                    <div className={cn("h-full rounded-full bg-primary transition-[width]", percent === null && "w-1/3 animate-pulse")} style={percent === null ? undefined : { width: `${percent}%` }} />
                  </div>
                ) : null}
                {job.warning ? (
                  <p className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2 py-1.5 text-xs text-foreground">
                    <Warning className="mt-0.5 shrink-0 text-warning" size={14} weight="bold" />
                    {job.warning}
                  </p>
                ) : null}
                {job.status === "FAILED" && job.errorMessage ? <p className="text-xs text-danger">{job.errorMessage}</p> : null}
                {job.status === "SUCCEEDED" && job.importJob && job.resultMessage ? <p className="text-xs text-success">{job.resultMessage}</p> : null}
                {isAvatarPending(job) ? (
                  <p className="text-xs text-muted">
                    Đang gắn ảnh đại diện · {job.avatarProcessed ?? 0}/{job.avatarTotal ?? 0}
                  </p>
                ) : null}
                {job.avatarStatus === "DONE" && (job.avatarTotal ?? 0) > 0 ? (
                  <p className="text-xs text-success">
                    Đã gắn ảnh đại diện cho {job.avatarSucceeded ?? 0}/{job.avatarTotal} hồ sơ
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {job.status === "SUCCEEDED" && job.downloadable ? (
                    <Button onClick={() => void download(job)} size="sm" type="button" variant="outline">
                      <DownloadSimple size={16} />
                      Tải về
                    </Button>
                  ) : null}
                  {job.importJob && job.errors?.length ? (
                    <Button onClick={() => setOpenErrors(openErrors === job.id ? null : job.id)} size="sm" type="button" variant="outline">
                      {openErrors === job.id ? "Ẩn lỗi" : `Xem ${job.errors.length} lỗi`}
                    </Button>
                  ) : null}
                  {job.avatarWarnings?.length ? (
                    <Button onClick={() => setOpenAvatarWarnings(openAvatarWarnings === job.id ? null : job.id)} size="sm" type="button" variant="outline">
                      {openAvatarWarnings === job.id ? "Ẩn lỗi ảnh" : `Xem ${job.avatarWarnings.length} hồ sơ lỗi ảnh`}
                    </Button>
                  ) : null}
                  {active && (!job.importJob || job.status === "QUEUED") ? (
                    <Button onClick={() => void cancel(job)} size="sm" type="button" variant="ghost">
                      Hủy
                    </Button>
                  ) : null}
                </div>
                {openErrors === job.id && job.errors?.length ? <ImportErrorsTable errors={job.errors} /> : null}
                {openAvatarWarnings === job.id && job.avatarWarnings?.length ? <AvatarWarningsList warnings={job.avatarWarnings} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
