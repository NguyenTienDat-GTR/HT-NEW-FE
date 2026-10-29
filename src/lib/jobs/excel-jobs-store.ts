"use client";

import { useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";
import { EXCEL_JOB_TERMINAL, type ExcelJob } from "@/lib/api/client";

const STORAGE_KEY = "ht.excel-jobs";
const MAX_TRACKED = 8;

type JobsState = {
  jobs: ExcelJob[];
  track: (job: ExcelJob) => void;
  update: (job: ExcelJob) => void;
  dismiss: (id: string) => void;
};

function load(): ExcelJob[] {
  try {
    const raw = typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ExcelJob[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_TRACKED) : [];
  } catch {
    return [];
  }
}

function save(jobs: ExcelJob[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // sessionStorage bị chặn: khay vẫn hoạt động trong phiên hiện tại
  }
}

// Các tác vụ nền đang theo dõi: lưu trong sessionStorage để tải lại trang vẫn thấy tiến độ và không mất tác vụ đang chạy.
export const excelJobsStore = createStore<JobsState>((set, get) => ({
  jobs: [],
  track: (job) => {
    const others = get().jobs.filter((item) => item.id !== job.id);
    const jobs = [job, ...others].slice(0, MAX_TRACKED);
    save(jobs);
    set({ jobs });
  },
  update: (job) => {
    const jobs = get().jobs.map((item) => (item.id === job.id ? { ...job, replayed: item.replayed } : item));
    save(jobs);
    set({ jobs });
  },
  dismiss: (id) => {
    const jobs = get().jobs.filter((item) => item.id !== id);
    save(jobs);
    set({ jobs });
  },
}));

// Nạp lại danh sách đã lưu (gọi một lần ở client sau khi hydrate).
export function restoreExcelJobs() {
  const saved = load();
  if (saved.length) excelJobsStore.setState({ jobs: saved });
}

export function useExcelJobs() {
  return useSyncExternalStore(
    excelJobsStore.subscribe,
    () => excelJobsStore.getState().jobs,
    () => excelJobsStore.getState().jobs,
  );
}

export function isActiveJob(job: ExcelJob) {
  return !EXCEL_JOB_TERMINAL.includes(job.status);
}

// Dữ liệu đã lưu nhưng ảnh đại diện còn đang được gắn vào hồ sơ.
export function isAvatarPending(job: ExcelJob) {
  return job.avatarStatus === "PENDING" || job.avatarStatus === "RUNNING";
}

// Cần tiếp tục poll: job còn chạy hoặc ảnh chưa gắn xong.
export function needsPolling(job: ExcelJob) {
  return isActiveJob(job) || isAvatarPending(job);
}
