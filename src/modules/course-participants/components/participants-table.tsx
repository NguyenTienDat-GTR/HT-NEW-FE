"use client";

import { ArrowCounterClockwise, Check, EnvelopeSimple, EnvelopeSimpleOpen, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/modules/layout-config/form-controls";
import { shortUnitName } from "@/lib/unit-name";
import type { ParticipantRow } from "../types";

export function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

// Tình trạng email của một hồ sơ: đã gửi, lỗi (kèm lý do), thiếu / sai email hay chưa gửi.
export function InvitationStatus({ row }: { row: ParticipantRow }) {
  if (row.invitationError) {
    return (
      <span className="inline-flex max-w-[220px] items-start gap-1 text-[12px] text-danger" title={row.invitationError}>
        <Warning className="mt-0.5 shrink-0" size={14} weight="fill" />
        <span className="line-clamp-2">{row.invitationError}</span>
      </span>
    );
  }
  if (row.invitationSentAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-success" title={`Đã gửi lúc ${formatTime(row.invitationSentAt)}`}>
        <EnvelopeSimpleOpen size={14} weight="fill" /> Đã gửi {formatTime(row.invitationSentAt)}
      </span>
    );
  }
  if (row.emailProblem) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-warning" title={row.emailProblem}>
        <Warning size={14} weight="fill" /> {row.emailProblem.startsWith("Email không hợp lệ") ? "Email sai định dạng" : "Chưa có email"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <EnvelopeSimple size={14} /> Chưa gửi
    </span>
  );
}

export function ParticipantsTable({
  rows,
  loading,
  selected,
  attendanceEnabled,
  canManage,
  togglingId,
  onToggleRow,
  onToggleAll,
  onToggleCheckedIn,
  onOpenDetail,
}: {
  rows: ParticipantRow[];
  loading: boolean;
  selected: Set<string>;
  attendanceEnabled: boolean;
  canManage: boolean;
  togglingId: string | null;
  onToggleRow: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleCheckedIn: (row: ParticipantRow) => void;
  onOpenDetail: (row: ParticipantRow) => void;
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-[13px]">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          <tr>
            <th className="w-10 px-3 py-2.5">
              <input aria-label="Chọn tất cả hồ sơ trong trang" checked={allSelected} className="h-4 w-4 accent-[var(--primary)]" disabled={rows.length === 0} onChange={(event) => onToggleAll(event.target.checked)} type="checkbox" />
            </th>
            <th className="px-3 py-2.5">Huynh trưởng</th>
            <th className="px-3 py-2.5">Giáo xứ / Giáo hạt</th>
            <th className="px-3 py-2.5">Đội</th>
            <th className="px-3 py-2.5">Email</th>
            <th className="px-3 py-2.5">Thông tin tham dự</th>
            {attendanceEnabled ? <th className="px-3 py-2.5">Điểm danh</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading && rows.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-muted" colSpan={attendanceEnabled ? 7 : 6}>Đang tải danh sách…</td>
            </tr>
          ) : null}
          {!loading && rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center text-muted" colSpan={attendanceEnabled ? 7 : 6}>Không có hồ sơ nào phù hợp.</td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr className={selected.has(row.id) ? "bg-primary-soft/40" : undefined} key={row.id}>
              <td className="px-3 py-2.5">
                <input aria-label={`Chọn ${row.fullName}`} checked={selected.has(row.id)} className="h-4 w-4 accent-[var(--primary)]" onChange={() => onToggleRow(row.id)} type="checkbox" />
              </td>
              <td className="px-3 py-2.5 font-medium text-foreground">
                <button aria-label={`Xem chi tiết ${row.fullName}`} className="cursor-pointer text-left font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => onOpenDetail(row)} type="button">
                  {[row.holyName, row.fullName].filter(Boolean).join(" ")}
                </button>
              </td>
              <td className="px-3 py-2.5 text-text-secondary">
                <span className="block">{shortUnitName(row.parishName) || "—"}</span>
                <span className="block text-xs text-muted">{shortUnitName(row.deaneryName)}</span>
              </td>
              <td className="px-3 py-2.5">{row.teamName ? <Pill>{row.teamName}</Pill> : <span className="text-muted">Chưa chia đội</span>}</td>
              <td className="max-w-[220px] px-3 py-2.5 text-text-secondary">
                <span className="block break-all">{row.email?.trim() ? row.email : "—"}</span>
              </td>
              <td className="px-3 py-2.5">
                <InvitationStatus row={row} />
              </td>
              {attendanceEnabled ? (
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {row.checkedInAt ? (
                      <Pill tone="success">
                        <Check className="mr-0.5 inline" size={11} weight="bold" />
                        {formatTime(row.checkedInAt)}
                      </Pill>
                    ) : (
                      <Pill>Chưa điểm danh</Pill>
                    )}
                    {canManage ? (
                      <Button
                        aria-label={row.checkedInAt ? `Bỏ điểm danh ${row.fullName}` : `Điểm danh ${row.fullName}`}
                        loading={togglingId === row.id}
                        onClick={() => onToggleCheckedIn(row)}
                        size="sm"
                        title={row.checkedInAt ? "Bỏ điểm danh" : "Điểm danh thủ công"}
                        type="button"
                        variant="outline"
                      >
                        {row.checkedInAt ? <ArrowCounterClockwise size={14} /> : <Check size={14} />}
                        {row.checkedInAt ? "Bỏ" : "Điểm danh"}
                      </Button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
