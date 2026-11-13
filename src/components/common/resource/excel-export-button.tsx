"use client";

import { FileXls, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { newIdempotencyKey } from "@/lib/api/idempotency";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix, isSuperAdmin } from "@/lib/auth/permissions";
import { createExcelExportJob } from "@/lib/jobs/excel-jobs-client";
import { excelJobsStore } from "@/lib/jobs/excel-jobs-store";
import { cn } from "@/lib/utils";

// Endpoint danh sách -> tên file xuất. Chỉ các danh sách có endpoint `/export` ở backend mới có nút xuất.
export const EXCEL_EXPORT_FILES: Record<string, string> = {
  "/dioceses": "giao-phan.xlsx",
  "/deaneries": "giao-hat.xlsx",
  "/parishes": "giao-xu.xlsx",
  "/leaders": "ho-so-huynh-truong.xlsx",
  "/training/courses": "khoa-huan-luyen.xlsx",
  "/training/participations": "dang-ky-tham-du.xlsx",
  "/training/participants": "danh-sach-tham-du.xlsx",
  "/training/participants/teams": "chia-doi.xlsx",
  "/certificates": "chung-nhan.xlsx",
};

// Endpoint danh sách -> loại tác vụ xuất ở backend (dùng để lấy danh sách cột chọn được).
const EXPORT_KINDS: Record<string, string> = {
  "/dioceses": "EXPORT_DIOCESES",
  "/deaneries": "EXPORT_DEANERIES",
  "/parishes": "EXPORT_PARISHES",
  "/leaders": "EXPORT_LEADERS",
  "/training/courses": "EXPORT_COURSES",
  "/training/participations": "EXPORT_PARTICIPATIONS",
  "/training/participants": "EXPORT_PARTICIPANTS",
  "/training/participants/teams": "EXPORT_TEAMS",
  "/certificates": "EXPORT_CERTIFICATES",
};

// Danh sách đăng ký của một khóa còn xuất được theo mẫu Excel của giáo phận.
const TEMPLATE_ENDPOINT = "/training/participations";

type GroupBy = "NONE" | "DEANERY" | "PARISH";
type Layout = "SINGLE_SHEET" | "SHEET_PER_GROUP" | "FILE_PER_GROUP";

// Bỏ phân trang: file xuất luôn chứa toàn bộ kết quả của bộ lọc/tìm kiếm/sắp xếp đang dùng (không lọc thì xuất tất cả).
export function buildExportPath(endpoint: string, queryString: string, extra?: URLSearchParams, suffix = "/export") {
  const params = new URLSearchParams(queryString);
  params.delete("page");
  params.delete("size");
  extra?.forEach((value, key) => params.append(key, value));
  const query = params.toString();
  return `${endpoint}${suffix}${query ? `?${query}` : ""}`;
}

function courseCodeOf(queryString: string) {
  try {
    const raw = new URLSearchParams(queryString).get("filters");
    const code = raw ? (JSON.parse(raw) as Record<string, unknown>)["course.courseCode"] : undefined;
    return typeof code === "string" && code ? code : null;
  } catch {
    return null;
  }
}

function storageKey(endpoint: string) {
  return `excel-export-columns:${endpoint}`;
}

function readStoredColumns(endpoint: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(endpoint));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : null;
  } catch {
    return null;
  }
}

function storeColumns(endpoint: string, columns: string[]) {
  try {
    window.localStorage.setItem(storageKey(endpoint), JSON.stringify(columns));
  } catch {
    // không lưu được lựa chọn: lần sau chọn lại
  }
}

// Xuất chạy nền: hộp thoại chọn cột (và cách xuất theo mẫu), rồi tạo tác vụ và trả quyền điều khiển ngay; tiến độ và nút tải về nằm ở khay tác vụ.
export function ExcelExportButton({ endpoint, queryString, empty = false }: { endpoint: string; queryString: string; empty?: boolean }) {
  const [open, setOpen] = useState(false);
  const fallbackName = EXCEL_EXPORT_FILES[endpoint];
  if (!fallbackName) return null;

  return (
    <>
      <Tip disabled={empty} label={empty ? "Không có dữ liệu để xuất" : "Chọn cột rồi xuất Excel theo bộ lọc đang chọn (không lọc thì xuất tất cả)"}>
        <Button disabled={empty} onClick={() => setOpen(true)} type="button" variant="outline">
          <FileXls size={18} />
          Xuất Excel
        </Button>
      </Tip>
      {open ? <ExcelExportDialog endpoint={endpoint} onClose={() => setOpen(false)} queryString={queryString} /> : null}
    </>
  );
}

function ExcelExportDialog({ endpoint, queryString, onClose }: { endpoint: string; queryString: string; onClose: () => void }) {
  const user = useAuthStore((state) => state.user);
  const kind = EXPORT_KINDS[endpoint];
  const courseCode = endpoint === TEMPLATE_ENDPOINT ? courseCodeOf(queryString) : null;
  const canConfigureTemplate = isSuperAdmin(user) || hasPermissionPrefix(user, "training.registration_template.update.");
  const [mode, setMode] = useState<"list" | "template">("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("PARISH");
  const [layout, setLayout] = useState<Layout>("SHEET_PER_GROUP");
  const [selected, setSelected] = useState<string[] | null>(null);
  const [exporting, setExporting] = useState(false);
  // Một khóa idempotency cho mỗi lựa chọn: bấm đúp hoặc thử lại cùng lựa chọn luôn trỏ về cùng một tác vụ, không xuất hai lần.
  const keys = useRef<Map<string, string>>(new Map());

  const columnsQuery = useQuery({
    queryKey: ["excel-export-columns", kind],
    queryFn: () => apiFetch<string[]>(`/excel-jobs/export-columns?kind=${encodeURIComponent(kind)}`),
    enabled: Boolean(kind),
    staleTime: 60 * 60 * 1000,
  });
  const allColumns = useMemo(() => columnsQuery.data ?? [], [columnsQuery.data]);
  // Lựa chọn lần trước (chỉ giữ cột còn tồn tại); chưa từng chọn thì chọn tất cả.
  const chosen = useMemo(() => {
    if (selected) return selected;
    const stored = typeof window === "undefined" ? null : readStoredColumns(endpoint);
    const kept = stored?.filter((column) => allColumns.includes(column)) ?? [];
    return kept.length ? kept : allColumns;
  }, [selected, endpoint, allColumns]);

  function toggle(column: string) {
    setSelected((chosen.includes(column) ? chosen.filter((item) => item !== column) : [...chosen, column]));
  }

  async function submit() {
    const extra = new URLSearchParams();
    let path: string;
    if (mode === "template") {
      extra.set("groupBy", groupBy);
      extra.set("layout", groupBy === "NONE" ? "SINGLE_SHEET" : layout);
      path = buildExportPath(endpoint, queryString, extra, "/template-export");
    } else {
      // Chọn đủ mọi cột thì không gửi danh sách cột (backend hiểu là tất cả).
      if (chosen.length && chosen.length < allColumns.length) {
        allColumns.filter((column) => chosen.includes(column)).forEach((column) => extra.append("columns", column));
      }
      path = buildExportPath(endpoint, queryString, extra);
      storeColumns(endpoint, chosen);
    }
    setExporting(true);
    let key = keys.current.get(path);
    if (!key) {
      key = newIdempotencyKey();
      keys.current.set(path, key);
    }
    try {
      let job = await createExcelExportJob(path, key);
      // Khóa này đã ứng với một tác vụ đã kết thúc (lần xuất trước): đây là yêu cầu xuất mới nên dùng khóa mới.
      if (job.replayed && ["SUCCEEDED", "FAILED", "CANCELLED"].includes(job.status)) {
        key = newIdempotencyKey();
        keys.current.set(path, key);
        job = await createExcelExportJob(path, key);
      }
      excelJobsStore.getState().track(job);
      toast.info(job.replayed ? "Tác vụ xuất này đã được tạo, xem ở khay tác vụ" : "Đã nhận yêu cầu, đang xuất Excel nền. Bạn có thể tiếp tục làm việc.");
      onClose();
    } catch (error) {
      keys.current.delete(path);
      toast.error(getApiErrorMessage(error), { duration: 10000 });
    } finally {
      setExporting(false);
    }
  }

  const listInvalid = mode === "list" && allColumns.length > 0 && chosen.length === 0;

  return (
    <Dialog.Root open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[620px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Xuất Excel</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                {mode === "list"
                  ? "File có phần đầu ghi giáo phận / giáo hạt / giáo xứ (theo bộ lọc, không lọc thì theo đơn vị của tài khoản) và tiêu đề danh sách, sau đó là các cột bạn chọn."
                  : "Điền danh sách đăng ký của khóa vào mẫu Excel của đơn vị tổ chức khóa (giáo hạt, hoặc giáo phận)."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {courseCode ? (
              <div className="mb-4 inline-flex rounded-lg border border-border bg-surface-1 p-1" role="tablist">
                {(
                  [
                    ["list", "Danh sách thường"],
                    ["template", "Theo mẫu đăng ký"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    aria-selected={mode === value}
                    className={cn(
                      "h-9 rounded-md px-3 text-sm font-semibold transition-colors",
                      mode === value ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
                    )}
                    key={value}
                    onClick={() => setMode(value)}
                    role="tab"
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {mode === "list" ? (
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Cột xuất ra <span className="font-normal text-muted">({chosen.length}/{allColumns.length})</span>
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => setSelected(allColumns)} size="sm" type="button" variant="ghost">
                      Chọn tất cả
                    </Button>
                    <Button onClick={() => setSelected([])} size="sm" type="button" variant="ghost">
                      Bỏ chọn
                    </Button>
                  </div>
                </div>
                {columnsQuery.isLoading ? (
                  <p className="text-sm text-muted">Đang tải danh sách cột...</p>
                ) : columnsQuery.isError ? (
                  <p className="text-sm text-danger">{getApiErrorMessage(columnsQuery.error)}</p>
                ) : (
                  <div className="grid gap-1 sm:grid-cols-2">
                    {allColumns.map((column) => (
                      <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm text-foreground hover:bg-surface-1" key={column}>
                        <input checked={chosen.includes(column)} className="h-4 w-4 accent-primary" onChange={() => toggle(column)} type="checkbox" />
                        {column}
                      </label>
                    ))}
                  </div>
                )}
                {listInvalid ? <p className="mt-2 text-sm text-danger">Chọn ít nhất một cột để xuất</p> : null}
              </div>
            ) : (
              <div className="space-y-5">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-foreground">Gom danh sách</legend>
                  <div className="grid gap-1 sm:grid-cols-3">
                    {(
                      [
                        ["NONE", "Không gom"],
                        ["DEANERY", "Theo giáo hạt"],
                        ["PARISH", "Theo giáo xứ"],
                      ] as const
                    ).map(([value, label]) => (
                      <Choice checked={groupBy === value} key={value} label={label} name="groupBy" onChange={() => setGroupBy(value)} />
                    ))}
                  </div>
                </fieldset>
                <fieldset disabled={groupBy === "NONE"}>
                  <legend className={cn("mb-2 text-sm font-semibold", groupBy === "NONE" ? "text-muted" : "text-foreground")}>Cách chia</legend>
                  <div className="grid gap-1">
                    <Choice
                      checked={layout === "SINGLE_SHEET"}
                      hint="Một bảng chung, có dòng tên giáo hạt / giáo xứ ngăn giữa các nhóm"
                      label="Gom trong một sheet"
                      name="layout"
                      onChange={() => setLayout("SINGLE_SHEET")}
                    />
                    <Choice
                      checked={layout === "SHEET_PER_GROUP"}
                      hint="Mỗi sheet là một bản mẫu đã điền tên đơn vị, STT đánh lại từ 1"
                      label="Mỗi nhóm một sheet"
                      name="layout"
                      onChange={() => setLayout("SHEET_PER_GROUP")}
                    />
                    <Choice
                      checked={layout === "FILE_PER_GROUP"}
                      hint="Tải về file .zip gồm nhiều file Excel, mỗi nhóm một file"
                      label="Mỗi nhóm một file (.zip)"
                      name="layout"
                      onChange={() => setLayout("FILE_PER_GROUP")}
                    />
                  </div>
                </fieldset>
                <p className="text-sm leading-6 text-muted">
                  Danh sách theo đúng bộ lọc đang chọn ở tab.{" "}
                  {canConfigureTemplate ? (
                    <Link className="font-semibold text-primary underline-offset-2 hover:underline" href="/training/registration-template">
                      Cấu hình mẫu danh sách đăng ký
                    </Link>
                  ) : (
                    "Mẫu do quản trị giáo phận / giáo hạt soạn."
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border p-4">
            <Button onClick={onClose} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={listInvalid || (mode === "list" && columnsQuery.isLoading)} loading={exporting} onClick={submit} type="button" variant="primary">
              <FileXls size={18} />
              Xuất
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Choice({ checked, label, hint, name, onChange }: { checked: boolean; label: string; hint?: string; name: string; onChange: () => void }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm", checked ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-1")}>
      <input checked={checked} className="mt-0.5 h-4 w-4 accent-primary" name={name} onChange={onChange} type="radio" />
      <span>
        <span className="font-semibold text-foreground">{label}</span>
        {hint ? <span className="mt-0.5 block text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
