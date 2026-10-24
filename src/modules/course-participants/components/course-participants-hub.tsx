"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EnvelopeSimple, FilePdf, MagnifyingGlass, QrCode } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Tip } from "@/components/ui/tip";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Callout, SELECT_CLASS } from "@/modules/badges/components/form-controls";
import { exportBadges, fetchParticipants, fetchSummary, participantKeys, sendInvitations, setCheckedIn } from "../api";
import { EMPTY_PARTICIPANT_QUERY, PARTICIPANT_PAGE_SIZES, activeFilterCount, type ParticipantQueryState } from "../participant-query";
import type { BadgeExportOptions, InvitationOptions, InvitationResult, InvitationFilter, ParticipantRow } from "../types";
import { AttendanceScannerDialog } from "./attendance-scanner-dialog";
import { BadgeExportDialog } from "./badge-export-dialog";
import { InvitationDialog } from "./invitation-dialog";
import { InvitationResultDialog } from "./invitation-result-dialog";
import { ParticipantDetailDrawer } from "./participant-detail-drawer";
import { ParticipantsTable } from "./participants-table";

type CourseInfo = {
  courseCode: string;
  courseName: string;
  attendanceEnabled: boolean;
  autoSendInvitation: boolean;
  // Khóa bị vô hiệu hóa hoặc đã kết thúc: chỉ xem / xuất thẻ, không gửi email hay điểm danh.
  disabled: boolean;
  finished: boolean;
  // Người duyệt đăng ký đúng cấp quản lý khóa mới gửi email, quét và sửa điểm danh được.
  canManage: boolean;
  // Quyền riêng quét / xác nhận điểm danh (training.attendance.scan.*), không phụ thuộc quyền duyệt đăng ký.
  canScan: boolean;
};

// Tab "Thẻ & điểm danh" của khóa: tổng quan điểm danh / email, danh sách hồ sơ tham dự kèm tình trạng, và các thao tác
// xuất thẻ PDF, gửi email thông tin tham dự (kèm QR), quét QR điểm danh.
export function CourseParticipantsHub({ course, search }: { course: CourseInfo; search: string }) {
  const { courseCode } = course;
  const queryClient = useQueryClient();
  const [state, setState] = useState<ParticipantQueryState>(EMPTY_PARTICIPANT_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const debounced = useDebouncedValue(searchInput).trim();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const effective = useMemo<ParticipantQueryState>(() => ({ ...state, search: [search.trim(), debounced].filter(Boolean).join(" ") }), [state, debounced, search]);
  const params = JSON.stringify(effective);

  const summaryQuery = useQuery({ queryKey: participantKeys.summary(courseCode), queryFn: () => fetchSummary(courseCode), refetchOnMount: "always" });
  const listQuery = useQuery({
    queryKey: participantKeys.list(courseCode, params),
    queryFn: () => fetchParticipants(courseCode, effective),
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
  });
  const teamsQuery = useQuery({
    queryKey: [...participantKeys.all(courseCode), "teams"],
    queryFn: () => apiFetch<{ teamName: string }[]>(`/training/courses/${encodeURIComponent(courseCode)}/teams/options`),
    staleTime: 60_000,
  });
  const teams = useMemo(() => (teamsQuery.data ?? []).map((item) => item.teamName), [teamsQuery.data]);

  const summary = summaryQuery.data;
  const rows = listQuery.data?.content ?? [];
  const totalElements = listQuery.data?.totalElements ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 0;
  const selectedIds = useMemo(() => [...selected], [selected]);

  function patch(next: Partial<ParticipantQueryState>) {
    setState((current) => ({ ...current, ...next, page: next.page ?? 0 }));
  }

  async function refreshAll() {
    await queryClient.invalidateQueries({ queryKey: participantKeys.all(courseCode) });
  }

  const sendMutation = useMutation({
    mutationFn: (options: InvitationOptions) => sendInvitations(courseCode, options),
    onMutate: () => ({ toastId: toast.loading("Đang gửi email thông tin tham dự…") }),
    onSuccess: async (job, _options, context) => {
      toast.dismiss(context?.toastId);
      setInviteOpen(false);
      setSelected(new Set());
      setResult(job.result ?? null);
      await refreshAll();
    },
    onError: (error, _options, context) => toast.error(getApiErrorMessage(error), { id: context?.toastId, duration: 10000 }),
  });

  const exportMutation = useMutation({
    mutationFn: (options: BadgeExportOptions) => exportBadges(courseCode, options),
    onMutate: () => ({ toastId: toast.loading("Đang tạo PDF thẻ tham dự…") }),
    onSuccess: (done, _options, context) => {
      toast.success(`Đã xuất ${done.badgeCount} thẻ (${done.pageCount} trang)`, { id: context?.toastId });
      setExportOpen(false);
    },
    onError: (error, _options, context) => toast.error(getApiErrorMessage(error), { id: context?.toastId, duration: 10000 }),
  });

  const checkInMutation = useMutation({
    mutationFn: (row: ParticipantRow) => setCheckedIn(courseCode, row.id, !row.checkedInAt),
    onMutate: (row) => setTogglingId(row.id),
    onSuccess: async (_data, row) => {
      toast.success(row.checkedInAt ? `Đã bỏ điểm danh ${row.fullName}` : `Đã điểm danh ${row.fullName}`);
      await refreshAll();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
    onSettled: () => setTogglingId(null),
  });

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of rows) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

  const canSend = course.canManage && !course.disabled && !course.finished;
  const canScan = course.canScan && !course.disabled && !course.finished && course.attendanceEnabled;
  const filters = activeFilterCount(state);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          detail={course.attendanceEnabled ? `${summary?.notCheckedIn ?? 0} chưa điểm danh` : "Khóa chưa bật điểm danh"}
          label="Đã điểm danh"
          loading={summaryQuery.isLoading}
          tone="primary"
          value={course.attendanceEnabled ? `${summary?.checkedIn ?? 0}/${summary?.totalParticipants ?? 0}` : "—"}
        />
        <StatCard detail={`${summary?.invitationPending ?? 0} chưa gửi`} label="Đã gửi email thông tin" loading={summaryQuery.isLoading} value={`${summary?.invitationSent ?? 0}/${summary?.totalParticipants ?? 0}`} />
        <StatCard detail="Cần xem lại lý do và gửi lại" label="Gửi lỗi" loading={summaryQuery.isLoading} tone={summary && summary.invitationFailed > 0 ? "danger" : undefined} value={String(summary?.invitationFailed ?? 0)} />
        <StatCard detail="Chưa có hoặc sai định dạng" label="Thiếu / sai email" loading={summaryQuery.isLoading} tone={summary && summary.withoutEmail > 0 ? "warning" : undefined} value={String(summary?.withoutEmail ?? 0)} />
      </div>

      {!course.attendanceEnabled ? (
        <Callout>Khóa chưa bật điểm danh nên chưa quét được mã QR và email thông tin tham dự không kèm mã QR. Bật trong “Sửa khóa” → mục Điểm danh và thẻ tham dự.</Callout>
      ) : null}
      {course.finished || course.disabled ? <Callout tone="warning">Khóa đã kết thúc hoặc bị vô hiệu hóa: chỉ xuất thẻ và xem tình trạng, không gửi email hay điểm danh được nữa.</Callout> : null}

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Danh sách tham dự</h2>
            <p className="text-[13px] text-muted">
              {totalElements} hồ sơ{effective.search || filters ? " khớp bộ lọc" : ""}
              {selected.size > 0 ? ` · đã chọn ${selected.size}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tip label={selected.size > 0 ? `Xuất thẻ cho ${selected.size} hồ sơ đã chọn` : "Xuất thẻ PDF cho cả danh sách (hoặc một đội)"}>
              <Button disabled={!summary || summary.totalParticipants === 0} onClick={() => setExportOpen(true)} type="button" variant="outline">
                <FilePdf size={16} /> Xuất thẻ{selected.size > 0 ? ` (${selected.size})` : ""}
              </Button>
            </Tip>
            {canSend ? (
              <Tip label={selected.size > 0 ? `Gửi email cho ${selected.size} hồ sơ đã chọn` : "Gửi email thông tin tham dự cho cả danh sách"}>
                <Button disabled={!summary || summary.totalParticipants === 0} onClick={() => setInviteOpen(true)} type="button" variant="outline">
                  <EnvelopeSimple size={16} /> Gửi email{selected.size > 0 ? ` (${selected.size})` : ""}
                </Button>
              </Tip>
            ) : null}
            {canScan ? (
              <Button onClick={() => setScanOpen(true)} type="button">
                <QrCode size={16} /> Quét QR điểm danh
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-[360px]" role="search">
            <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input aria-label="Tìm trong danh sách tham dự" className="pl-9" onChange={(event) => { setSearchInput(event.target.value); patch({ page: 0 }); }} placeholder="Tìm theo tên, giáo xứ, đội, email…" type="search" value={searchInput} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Lọc theo đội" className={SELECT_CLASS} onChange={(event) => patch({ team: event.target.value })} value={state.team}>
              <option value="">Mọi đội</option>
              {teams.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {course.attendanceEnabled ? (
              <select aria-label="Lọc theo điểm danh" className={SELECT_CLASS} onChange={(event) => patch({ checkedIn: event.target.value as ParticipantQueryState["checkedIn"] })} value={state.checkedIn}>
                <option value="">Mọi trạng thái điểm danh</option>
                <option value="true">Đã điểm danh</option>
                <option value="false">Chưa điểm danh</option>
              </select>
            ) : null}
            <select aria-label="Lọc theo email" className={SELECT_CLASS} onChange={(event) => patch({ invitation: event.target.value as "" | InvitationFilter })} value={state.invitation}>
              <option value="">Mọi tình trạng email</option>
              <option value="PENDING">Chưa gửi</option>
              <option value="SENT">Đã gửi</option>
              <option value="FAILED">Gửi lỗi</option>
              <option value="NO_EMAIL">Thiếu / sai email</option>
            </select>
            {filters > 0 ? (
              <Button onClick={() => patch({ team: "", checkedIn: "", invitation: "" })} type="button" variant="ghost">
                Xóa lọc ({filters})
              </Button>
            ) : null}
            {selected.size > 0 ? (
              <Button onClick={() => setSelected(new Set())} type="button" variant="ghost">
                Bỏ chọn ({selected.size})
              </Button>
            ) : null}
          </div>
        </div>

        {listQuery.isError ? (
          <p className="px-4 py-3 text-sm text-danger" role="alert">{getApiErrorMessage(listQuery.error)}</p>
        ) : null}
        <ParticipantsTable
          attendanceEnabled={course.attendanceEnabled}
          canManage={canScan}
          loading={listQuery.isLoading}
          onOpenDetail={(row) => setDetailId(row.id)}
          onToggleAll={toggleAll}
          onToggleCheckedIn={(row) => checkInMutation.mutate(row)}
          onToggleRow={toggleRow}
          rows={rows}
          selected={selected}
          togglingId={togglingId}
        />

        {totalElements > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-[13px] text-muted">
            <span>
              Trang {state.page + 1}/{Math.max(totalPages, 1)}
            </span>
            <div className="flex items-center gap-2">
              <select aria-label="Số dòng mỗi trang" className={SELECT_CLASS} onChange={(event) => setState((current) => ({ ...current, size: Number(event.target.value), page: 0 }))} value={state.size}>
                {PARTICIPANT_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size} dòng</option>
                ))}
              </select>
              <Button disabled={state.page <= 0} onClick={() => setState((current) => ({ ...current, page: Math.max(0, current.page - 1) }))} size="sm" type="button" variant="outline">
                Trước
              </Button>
              <Button disabled={state.page + 1 >= totalPages} onClick={() => setState((current) => ({ ...current, page: current.page + 1 }))} size="sm" type="button" variant="outline">
                Sau
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      <BadgeExportDialog
        courseCode={courseCode}
        onExport={(options) => exportMutation.mutate(options)}
        onOpenChange={setExportOpen}
        open={exportOpen}
        pending={exportMutation.isPending}
        selectedIds={selectedIds}
        teams={teams}
        totalParticipants={summary?.totalParticipants ?? 0}
      />
      <InvitationDialog
        attendanceEnabled={course.attendanceEnabled}
        onOpenChange={setInviteOpen}
        onSend={(options) => sendMutation.mutate(options)}
        open={inviteOpen}
        pending={sendMutation.isPending}
        selectedIds={selectedIds}
        summary={{ total: summary?.totalParticipants ?? 0, sent: summary?.invitationSent ?? 0, pending: summary?.invitationPending ?? 0, withoutEmail: summary?.withoutEmail ?? 0 }}
      />
      <AttendanceScannerDialog courseCode={courseCode} courseName={course.courseName} onOpenChange={setScanOpen} open={scanOpen} />
      <ParticipantDetailDrawer courseCode={courseCode} onClose={() => setDetailId(null)} participationId={detailId} />
      <InvitationResultDialog courseName={course.courseName} onClose={() => setResult(null)} result={result} />
    </div>
  );
}

function StatCard({ label, value, detail, tone, loading }: { label: string; value: string; detail: string; tone?: "primary" | "danger" | "warning"; loading?: boolean }) {
  const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <Panel className="px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{loading ? "…" : value}</p>
      <p className="mt-0.5 text-[13px] text-muted">{detail}</p>
    </Panel>
  );
}
