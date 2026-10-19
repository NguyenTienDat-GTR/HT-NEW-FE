"use client";

import { MagnifyingGlass, Trash, UsersThree, X } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatLeaderLevel } from "@/components/common/resource/resource-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/modules/leaders/components/leader-detail-utils";
import { optionFromRow, rowsFromResponse } from "./api-utils";

export type RegistrationCandidate = {
  id: string;
  holyName?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  leaderLevel?: string | null;
  parishId?: string | null;
  parishName?: string | null;
  deaneryId?: string | null;
  deaneryName?: string | null;
};

// Mỗi phần tử của danh sách ngoại lệ có thêm lí do.
export type RegistrationEntry = RegistrationCandidate & { reason?: string };

export type RegistrationListMode = "standard" | "exception";

const PAGE_SIZE = 10;

export function registrationEntries(value: unknown): RegistrationEntry[] {
  return Array.isArray(value) ? (value as RegistrationEntry[]).filter((item) => item && typeof item === "object" && "id" in item) : [];
}

export function RegistrationListField({
  mode,
  value,
  courseCode,
  otherEntries,
  readonly,
  onChange,
}: {
  mode: RegistrationListMode;
  value: unknown;
  courseCode: string;
  // Danh sách còn lại (đăng ký <-> ngoại lệ): hai danh sách không được trùng người.
  otherEntries: RegistrationEntry[];
  readonly?: boolean;
  onChange: (entries: RegistrationEntry[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const entries = registrationEntries(value);
  const exception = mode === "exception";
  const disabled = readonly || !courseCode;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={disabled} onClick={() => setOpen(true)} type="button" variant="outline">
          <UsersThree size={18} />
          {exception ? "Thêm ngoại lệ" : "Lập danh sách"}
        </Button>
        <span className="text-sm text-muted">
          {courseCode ? (entries.length ? `Đã chọn ${entries.length} huynh trưởng` : "Chưa có huynh trưởng nào") : "Chọn khóa huấn luyện trước"}
        </span>
      </div>

      {entries.length ? (
        <ul className="divide-y divide-border rounded-[8px] border border-border bg-white">
          {entries.map((entry) => (
            <li className="flex items-start justify-between gap-3 px-3 py-2 text-sm" key={entry.id}>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {[entry.holyName, entry.fullName].filter(Boolean).join(" ")}
                  <span className="ml-2 font-normal text-muted">{[entry.parishName, entry.deaneryName].filter(Boolean).join(" · ")}</span>
                </p>
                {exception && entry.reason ? <p className="text-xs text-muted">Lí do: {entry.reason}</p> : null}
              </div>
              <button
                aria-label="Bỏ khỏi danh sách"
                className="shrink-0 cursor-pointer text-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                disabled={readonly}
                onClick={() => onChange(entries.filter((item) => item.id !== entry.id))}
                type="button"
              >
                <Trash size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <RegistrationCandidateModal
          courseCode={courseCode}
          entries={entries}
          mode={mode}
          onChange={onChange}
          onClose={() => setOpen(false)}
          otherEntries={otherEntries}
        />
      ) : null}
    </div>
  );
}

function RegistrationCandidateModal({
  mode,
  courseCode,
  entries,
  otherEntries,
  onChange,
  onClose,
}: {
  mode: RegistrationListMode;
  courseCode: string;
  entries: RegistrationEntry[];
  otherEntries: RegistrationEntry[];
  onChange: (entries: RegistrationEntry[]) => void;
  onClose: () => void;
}) {
  const exception = mode === "exception";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deaneryId, setDeaneryId] = useState("");
  const [parishId, setParishId] = useState("");
  const [page, setPage] = useState(0);
  // Danh sách thường: chọn nhiều (giữ lại qua các trang/tìm kiếm). Ngoại lệ: chọn 1 người kèm lí do.
  const [selected, setSelected] = useState<Record<string, RegistrationEntry>>(() => Object.fromEntries(entries.map((entry) => [entry.id, entry])));
  const [singleId, setSingleId] = useState("");
  const [reason, setReason] = useState("");
  const [added, setAdded] = useState<RegistrationEntry[]>(entries);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const deaneriesQuery = useQuery({
    queryKey: ["registration-scope", "deaneries"],
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>("/deaneries?page=0&size=100"),
  });
  const parishesQuery = useQuery({
    queryKey: ["registration-scope", "parishes"],
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>("/parishes?page=0&size=100"),
  });
  const deaneryOptions = useMemo(() => rowsFromResponse(deaneriesQuery.data).map((row) => optionFromRow(row, "id", "name")), [deaneriesQuery.data]);
  const parishRows = useMemo(() => rowsFromResponse(parishesQuery.data), [parishesQuery.data]);
  const parishOptions = useMemo(
    () =>
      parishRows
        .filter((row) => !deaneryId || String((row.deaneryId as string | undefined) ?? (row.deanery as { id?: string } | undefined)?.id ?? "") === deaneryId)
        .map((row) => optionFromRow(row, "id", "name")),
    [parishRows, deaneryId],
  );
  // Phạm vi tài khoản: chỉ có 1 giáo hạt/giáo xứ thì không cần bộ lọc và cột tương ứng.
  const showDeanery = deaneryOptions.length > 1;
  const showParish = parishRows.length > 1;

  // Người đã nằm ở danh sách còn lại, hoặc đã thêm vào danh sách ngoại lệ, không hiện lại.
  const excludeIds = useMemo(() => {
    const ids = otherEntries.map((entry) => entry.id);
    if (exception) added.forEach((entry) => ids.push(entry.id));
    return ids;
  }, [added, exception, otherEntries]);

  const candidatesQuery = useQuery({
    queryKey: ["registration-candidates", courseCode, mode, debouncedSearch, deaneryId, parishId, page, excludeIds.join(",")],
    queryFn: () => {
      const params = new URLSearchParams({ mode: exception ? "EXCEPTION" : "ELIGIBLE", page: String(page), size: String(PAGE_SIZE) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (deaneryId) params.set("deaneryId", deaneryId);
      if (parishId) params.set("parishId", parishId);
      excludeIds.forEach((id) => params.append("excludeLeaderIds", id));
      return apiFetch<PageResponse<RegistrationCandidate>>(`/training/courses/${encodeURIComponent(courseCode)}/registration-candidates?${params.toString()}`);
    },
  });
  const rows = candidatesQuery.data?.content ?? [];
  const totalPages = candidatesQuery.data?.totalPages ?? 0;
  const pageAllSelected = rows.length > 0 && rows.every((row) => selected[row.id]);

  function toggleRow(row: RegistrationCandidate) {
    if (exception) {
      setSingleId((current) => (current === row.id ? "" : row.id));
      return;
    }
    setSelected((current) => {
      const next = { ...current };
      if (next[row.id]) delete next[row.id];
      else next[row.id] = row;
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = { ...current };
      rows.forEach((row) => {
        if (pageAllSelected) delete next[row.id];
        else next[row.id] = row;
      });
      return next;
    });
  }

  function saveStandard() {
    onChange(Object.values(selected));
    onClose();
  }

  function addException() {
    const row = rows.find((item) => item.id === singleId);
    if (!row) {
      toast.error("Vui lòng chọn một huynh trưởng");
      return;
    }
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lí do ngoại lệ");
      return;
    }
    if (otherEntries.some((entry) => entry.id === row.id)) {
      toast.error("Huynh trưởng đã có trong danh sách đăng ký");
      return;
    }
    const next = [...added, { ...row, reason: reason.trim() }];
    setAdded(next);
    onChange(next);
    setSingleId("");
    setReason("");
    toast.success("Đã thêm vào danh sách ngoại lệ");
  }

  const title = exception ? "Thêm huynh trưởng ngoại lệ" : "Lập danh sách đăng ký";

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col rounded-[12px] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted">
              {exception
                ? "Danh sách huynh trưởng chưa đủ điều kiện của khóa. Mỗi lần chọn một người kèm lí do, sau đó có thể thêm người tiếp theo."
                : "Danh sách huynh trưởng đủ điều kiện theo loại khóa và số năm hoạt động của khóa. Có thể chọn nhiều người."}
            </p>
          </div>
          <button aria-label="Đóng" className="cursor-pointer text-muted hover:text-foreground" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[240px] flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <Input className="h-10 pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, giáo xứ, giáo hạt" value={search} />
          </div>
          {showDeanery ? (
            <select
              className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm"
              onChange={(event) => {
                setDeaneryId(event.target.value);
                setParishId("");
                setPage(0);
              }}
              value={deaneryId}
            >
              <option value="">Tất cả giáo hạt</option>
              {deaneryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
          {showParish ? (
            <select
              className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm"
              onChange={(event) => {
                setParishId(event.target.value);
                setPage(0);
              }}
              value={parishId}
            >
              <option value="">Tất cả giáo xứ</option>
              {parishOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.02em] text-muted">
              <tr className="border-b border-border">
                <th className="w-10 py-2">
                  {exception ? null : <input aria-label="Chọn cả trang" checked={pageAllSelected} className="h-4 w-4 accent-primary" onChange={togglePage} type="checkbox" />}
                </th>
                <th className="py-2">STT</th>
                <th className="py-2">Tên thánh</th>
                <th className="py-2">Họ tên</th>
                <th className="py-2">Ngày sinh</th>
                <th className="py-2">Số ĐT</th>
                <th className="py-2">Email</th>
                <th className="py-2">Cấp huynh trưởng</th>
                {showParish ? <th className="py-2">Giáo xứ</th> : null}
                {showDeanery ? <th className="py-2">Giáo hạt</th> : null}
              </tr>
            </thead>
            <tbody>
              {candidatesQuery.isLoading ? (
                <tr>
                  <td className="py-6 text-center text-muted" colSpan={10}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : null}
              {candidatesQuery.isError ? (
                <tr>
                  <td className="py-6 text-center text-danger" colSpan={10}>
                    Không thể tải danh sách huynh trưởng
                  </td>
                </tr>
              ) : null}
              {!candidatesQuery.isLoading && !candidatesQuery.isError && rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-muted" colSpan={10}>
                    Không có huynh trưởng phù hợp
                  </td>
                </tr>
              ) : null}
              {rows.map((row, index) => {
                const checked = exception ? singleId === row.id : Boolean(selected[row.id]);
                return (
                  <tr className={cn("cursor-pointer border-b border-border/60 hover:bg-primary/5", checked && "bg-primary/8")} key={row.id} onClick={() => toggleRow(row)}>
                    <td className="py-2">
                      <input
                        aria-label={`Chọn ${row.fullName ?? ""}`}
                        checked={checked}
                        className="h-4 w-4 accent-primary"
                        name={exception ? "exception-leader" : undefined}
                        onChange={() => toggleRow(row)}
                        onClick={(event) => event.stopPropagation()}
                        type={exception ? "radio" : "checkbox"}
                      />
                    </td>
                    <td className="py-2">{page * PAGE_SIZE + index + 1}</td>
                    <td className="py-2">{row.holyName ?? "—"}</td>
                    <td className="py-2 font-semibold text-foreground">{row.fullName ?? "—"}</td>
                    <td className="py-2">{formatDate(row.birthDate)}</td>
                    <td className="py-2">{row.phoneNumber ?? "—"}</td>
                    <td className="py-2">{row.email ?? "—"}</td>
                    <td className="py-2">{formatLeaderLevel(row.leaderLevel ?? "")}</td>
                    {showParish ? <td className="py-2">{row.parishName ?? "—"}</td> : null}
                    {showDeanery ? <td className="py-2">{row.deaneryName ?? "—"}</td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {exception ? (
          <div className="border-t border-border px-5 py-3">
            <label className="text-xs font-semibold uppercase tracking-[0.02em] text-muted" htmlFor="exception-reason">
              Lí do ngoại lệ <span className="text-danger">*</span>
            </label>
            <textarea
              className="mt-1 min-h-16 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]"
              id="exception-reason"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Nhập lí do cho huynh trưởng đã chọn"
              value={reason}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Button disabled={page <= 0} onClick={() => setPage((current) => Math.max(current - 1, 0))} size="sm" type="button" variant="outline">
              Trước
            </Button>
            <span>
              Trang {totalPages === 0 ? 0 : page + 1}/{totalPages}
            </span>
            <Button disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)} size="sm" type="button" variant="outline">
              Sau
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {exception ? (
              <>
                <span className="text-sm text-muted">Đã thêm {added.length} ngoại lệ</span>
                <Button onClick={addException} type="button">
                  Thêm vào danh sách
                </Button>
                <Button onClick={onClose} type="button" variant="outline">
                  Xong
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-muted">Đã chọn {Object.keys(selected).length}</span>
                <Button onClick={onClose} type="button" variant="outline">
                  Hủy
                </Button>
                <Button onClick={saveStandard} type="button">
                  Lưu danh sách
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
