"use client";

import { ArrowsCounterClockwiseIcon, ArrowUUpLeftIcon, CaretDownIcon, CheckCircleIcon, EyeIcon, FilePdfIcon, KeyIcon, PencilSimpleIcon, ProhibitInsetIcon, TrashIcon, XCircleIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import type { RouteConfig } from "@/config/routes/routes";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { canUseAction, hasPermissionPrefix } from "@/lib/auth/permissions";
import { Avatar, columnLabels, ResourceCell } from "./resource-format";
import { useEmbeddedResource, resourceActionHref, withReturnTo } from "./embedded-resource-context";
import { fillRoute, getResourceId, isAwaitingApproval, isReapprovable } from "./resource-actions";
import { canActOnCourse, type CourseAction } from "@/modules/training-courses/course-permissions";
import { canEditRow, canResetPasswordRow, canToggleRow, isPermanentlyRevokedAssignment } from "./resource-row-permissions";
import { scoreColumnLabel, scoreColumnWidthClass, scoreComponentCaption, type ScoreEntry, type ScoreNotes } from "./score-entry";
import { cn } from "@/lib/utils";
import { ScoreNoteAction } from "./score-note-action";
import { canCreateExceptionCertificate, ExceptionCertificateAction } from "./exception-certificate-action";
import { useIsDesktop } from "@/lib/use-media-query";
import { ResourceCardList } from "./resource-card-list";
import { RegistrationToggleButton } from "@/modules/training-courses/components/registration-toggle-button";
import type { ResourcePageSize } from "./use-resource-query-state";


export function ResourceTable({
  isLoading,
  rows,
  route,
  size,
  sort,
  sortBy,
  sortDirection,
  selection,
  scoreEntry,
  cellEditors,
  onExportRow,
  exportingRow,
  page = 0,
}: {
  page?: number;
  cellEditors?: Record<string, (row: Record<string, unknown>) => React.ReactNode>;
  scoreEntry?: ScoreEntry;
  // Chọn nhiều hồ sơ để duyệt/từ chối hàng loạt.
  selection?: { selectedIds: string[]; selectableIds: string[]; onToggle: (id: string) => void; onToggleAll: (on: boolean) => void };
  // Xuất PDF một chứng nhận ngay trên dòng (chỉ hiện với chứng nhận đã duyệt).
  onExportRow?: (id: string) => void;
  exportingRow?: boolean;
  isLoading: boolean;
  rows: Record<string, unknown>[];
  route: RouteConfig;
  size: ResourcePageSize;
  sort: (column: string) => void;
  sortBy?: string;
  sortDirection: "ASC" | "DESC";
}) {
  const user = useAuthStore((state) => state.user);
  const embedded = useEmbeddedResource();
  const isDesktop = useIsDesktop();
  // Trong chi tiết khóa, bảng đã thuộc về một khóa nên không cần cột khóa.
  const visibleColumns = visibleResourceColumns(route, rows, user)
    .filter((column) => !(embedded && column === "courseName"))
    // Hồ sơ huynh trưởng: ảnh + tên thánh + họ tên gộp thành một ô nhận diện.
    .filter((column) => !(route.kind === "leaders" && (column === "imageUrl" || column === "holyName")));

  // Dưới 1024px (tablet dọc, điện thoại) bảng rộng phải cuộn ngang nên chuyển sang dạng thẻ; từ 1024px trở lên giữ bảng.
  if (!isDesktop) {
    return (
      <ResourceCardList
        cellEditors={cellEditors}
        columns={visibleColumns}
        indexOffset={embedded ? page * size : undefined}
        isLoading={isLoading}
        renderActions={(row) => <RowActions exportingRow={exportingRow} onExportRow={onExportRow} route={route} row={row} scoreNotes={scoreEntry?.notes} />}
        renderIdentity={(row) => <LeaderIdentity row={row} />}
        route={route}
        rows={rows}
        scoreEntry={scoreEntry}
        selection={selection}
        size={size}
      />
    );
  }

  // Bảng chấm điểm có thể rất rộng vì nhiều cột điểm: ghim STT + Huynh trưởng bên trái và Thao tác bên phải,
  // cuộn ngang ở khung bảng (không làm tràn trang), tiêu đề không xuống dòng. Có cột chọn thì không ghim vì lệch vị trí ghim.
  const freezeLeader = Boolean(scoreEntry) && !selection;
  const leaderLeft = embedded ? "left-12" : "left-0";
  const headerLabel = (column: string) =>
    route.kind === "leaders" && column === "fullName" ? "Huynh trưởng" : scoreEntry ? scoreColumnLabel(column, columnLabels[column] ?? column) : (columnLabels[column] ?? column);

  return (
    <div className={cn("max-w-full overflow-x-auto", scoreEntry && "max-h-[70vh] overflow-y-auto")}>
      <table className={`w-full border-separate border-spacing-0 text-left text-sm ${scoreEntry ? "" : "min-w-270"}`}>
        <thead>
          <tr className="bg-slate-50">
            {selection ? (
              <th className="sticky top-0 z-10 h-11 w-10 border-b border-border bg-slate-50 px-3">
                <input
                  aria-label="Chọn tất cả hồ sơ đang chờ duyệt"
                  checked={selection.selectableIds.length > 0 && selection.selectableIds.every((id) => selection.selectedIds.includes(id))}
                  className="h-4 w-4 accent-primary"
                  disabled={selection.selectableIds.length === 0}
                  onChange={(event) => selection.onToggleAll(event.target.checked)}
                  type="checkbox"
                />
              </th>
            ) : null}
            {embedded ? (
              <th className={cn("sticky top-0 h-10 w-12 border-b border-border bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-text-secondary", freezeLeader ? "left-0 z-20 min-w-12 max-w-12" : "z-10")}>STT</th>
            ) : null}
            {visibleColumns.map((column) => (
              <th
                className={cn(
                  "sticky top-0 h-10 border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-text-secondary",
                  scoreEntry ? "px-2" : "px-3",
                  scoreEntry && `whitespace-nowrap ${scoreColumnWidthClass(column)}`,
                  freezeLeader && column === "leaderFullName" ? `${leaderLeft} z-20 shadow-(--shadow-table-sticky-left)` : "z-10",
                )}
                key={column}
              >
                {route.sortFields?.[column] === null ? (
                  <span className="inline-flex h-8 items-center px-1">{headerLabel(column)}</span>
                ) : (
                  <button className={cn("inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-1 transition-colors hover:text-primary", scoreEntry && "whitespace-nowrap")} onClick={() => sort(column)} type="button">
                    {headerLabel(column)}
                    {sortBy === column ? (
                      <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                        <CaretDownIcon className={sortDirection === "ASC" ? "rotate-180" : undefined} size={12} weight="bold" />
                        {sortDirection}
                      </span>
                    ) : null}
                  </button>
                )}
              </th>
            ))}
            {scoreEntry?.components.map((component) => (
              <th
                className="sticky top-0 z-10 h-10 w-32 min-w-32 border-b border-border bg-slate-50 px-2 align-middle text-xs font-semibold uppercase leading-tight tracking-wide text-text-secondary"
                key={component.id}
                title={`${component.name} · ${scoreComponentCaption(component)}`}
              >
                {/* Tên cột điểm dài thì cắt ở hai dòng (tên đầy đủ ở tooltip), không làm cao hay rộng thêm cột. */}
                <span className="line-clamp-2 break-words">{component.name}</span>
                <span className="block text-[10px] font-normal normal-case leading-tight text-muted">{scoreComponentCaption(component)}</span>
              </th>
            ))}
            <th className="sticky right-0 top-0 z-20 h-11 whitespace-nowrap border-b border-border bg-slate-50 px-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary shadow-(--shadow-table-sticky)">Thao tác</th>
          </tr>
        </thead>
        <tbody>{isLoading ? <ResourceTableSkeleton columns={visibleColumns} size={size} /> : <ResourceRows columns={visibleColumns} indexOffset={embedded ? page * size : undefined} route={route} rows={rows} scoreEntry={scoreEntry} cellEditors={cellEditors} selection={selection} onExportRow={onExportRow} exportingRow={exportingRow} freezeLeader={freezeLeader} leaderLeft={leaderLeft} />}</tbody>
      </table>
    </div>
  );
}

export function shouldHideStatusColumn(route: RouteConfig, rows: Record<string, unknown>[], user: AuthUser | null) {
  if (!route.columns.includes("status")) return false;
  // Giữ cột trạng thái khi có đơn vị đang bật nhưng bị khóa theo đơn vị cha, để người dùng thấy nhãn "Ngưng theo đơn vị cha".
  if (rows.some((row) => row.status === true && row.effectiveStatus === false)) return false;
  return rows.some((row) => canShowToggleSwitch(route, row, user));
}

export function visibleResourceColumns(route: RouteConfig, rows: Record<string, unknown>[], user: AuthUser | null) {
  return shouldHideStatusColumn(route, rows, user) ? route.columns.filter((column) => column !== "status") : route.columns;
}

function ResourceTableSkeleton({ columns, size }: { columns: string[]; size: ResourcePageSize }) {
  return Array.from({ length: size }).map((_, rowIndex) => (
    <tr key={rowIndex}>
      {columns.map((column) => (
        <td className="h-14 border-b border-slate-100 px-3" key={column}>
          <span className="block h-3 w-24 rounded bg-surface-2 motion-safe:animate-pulse" />
        </td>
      ))}
      <td className="sticky right-0 h-14 border-b border-slate-100 bg-white px-3 text-right shadow-(--shadow-table-sticky)">
        <span className="ml-auto block h-8 w-20 rounded bg-surface-2 motion-safe:animate-pulse" />
      </td>
    </tr>
  ));
}

function ResourceRows({
  columns,
  route,
  rows,
  selection,
  scoreEntry,
  cellEditors,
  indexOffset,
  onExportRow,
  exportingRow,
  freezeLeader = false,
  leaderLeft = "left-0",
}: {
  cellEditors?: Record<string, (row: Record<string, unknown>) => React.ReactNode>;
  // Có giá trị thì hiển thị cột STT bắt đầu từ offset (số hàng của các trang trước).
  indexOffset?: number;
  // Bảng chấm điểm: ghim cột STT và Huynh trưởng bên trái khi cuộn ngang (leaderLeft là vị trí ghim của cột Huynh trưởng).
  freezeLeader?: boolean;
  leaderLeft?: string;
  scoreEntry?: ScoreEntry;
  columns: string[];
  route: RouteConfig;
  rows: Record<string, unknown>[];
  selection?: { selectedIds: string[]; selectableIds: string[]; onToggle: (id: string) => void; onToggleAll: (on: boolean) => void };
  onExportRow?: (id: string) => void;
  exportingRow?: boolean;
}) {
  return rows.map((row, rowIndex) => {
    const rowId = getResourceId(route, row);
    const selectable = Boolean(selection && rowId && selection.selectableIds.includes(rowId));
    // Chứng nhận ngoại lệ do người chấm điểm tạo cho hồ sơ không đạt: tô nổi để người duyệt nhận ra.
    const flagged = route.kind === "certificates" && row.exceptionRequested === true;
    return (
    <tr className={`group transition-colors ${flagged ? "bg-warning/10 hover:bg-warning/15" : "bg-white hover:bg-slate-50"}`} key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}>
      {selection ? (
        <td className="h-14 w-10 border-b border-slate-100 px-3 align-middle">
          {selectable && rowId ? (
            <input
              aria-label="Chọn hồ sơ"
              checked={selection.selectedIds.includes(rowId)}
              className="h-4 w-4 accent-primary"
              onChange={() => selection.onToggle(rowId)}
              type="checkbox"
            />
          ) : null}
        </td>
      ) : null}
      {indexOffset !== undefined ? (
        <td className={cn("h-14 w-12 border-b border-slate-100 px-3 align-middle text-muted", freezeLeader && "sticky left-0 z-1 min-w-12 max-w-12 bg-white transition-colors group-hover:bg-slate-50")}>{indexOffset + rowIndex + 1}</td>
      ) : null}
      {columns.map((column) => (
        <td
          className={cn(
            "h-14 border-b border-slate-100 align-middle",
            scoreEntry ? "px-2 py-1" : "px-3",
            scoreEntry && scoreColumnWidthClass(column),
            freezeLeader && column === "leaderFullName" && `${leaderLeft} sticky z-1 bg-white shadow-(--shadow-table-sticky-left) transition-colors group-hover:bg-slate-50`,
          )}
          key={column}
        >
          {route.kind === "leaders" && column === "fullName" ? <LeaderIdentity row={row} /> : cellEditors?.[column] ? cellEditors[column](row) : <ResourceCell column={column} displayMode={scoreEntry ? "detail" : "table"} fullNames={route.kind === "leaders"} fullText={route.kind === "dioceses" || route.kind === "deaneries"} row={row} value={row[column]} />}
          {flagged && column === "leaderFullName" ? <span className="mt-1 inline-block rounded-md bg-warning/20 px-1.5 py-0.5 text-[11px] font-semibold text-warning">Chứng nhận ngoại lệ · cần lý do duyệt</span> : null}
        </td>
      ))}
      {scoreEntry?.components.map((component) => {
        const value = rowId ? scoreEntry.valueOf(rowId, row, component.id) : "";
        const editable = Boolean(rowId) && scoreEntry.isEditable(row);
        const invalid = scoreEntry.isInvalid(component, value);
        return (
          <td className="h-14 w-32 min-w-32 border-b border-slate-100 px-2 align-middle" key={component.id}>
            {editable && rowId ? (
              <input
                aria-label={`${component.name} của ${String(row.leaderFullName ?? "")}`}
                className={`h-8 w-20 rounded-md border bg-white px-2 text-right text-xs focus:outline-none focus:ring-2 ${invalid ? "border-danger focus:ring-danger/30" : "border-border focus:border-primary focus:ring-primary/20"} ${scoreEntry.drafts[rowId]?.values[component.id] !== undefined ? "bg-primary/5" : ""}`}
                inputMode="decimal"
                max={Number(component.maxScore)}
                min={0}
                onChange={(event) => scoreEntry.onChange(rowId, row, component.id, event.target.value)}
                step="0.01"
                type="number"
                value={value}
              />
            ) : (
              <span className="text-xs">{value === "" ? "—" : value}</span>
            )}
          </td>
        );
      })}
      <td className={`sticky right-0 h-14 border-b border-slate-100 px-3 text-right shadow-(--shadow-table-sticky) transition-colors ${flagged ? "bg-amber-50 group-hover:bg-amber-100" : "bg-white group-hover:bg-slate-50"}`}>
        <RowActions route={route} row={row} onExportRow={onExportRow} exportingRow={exportingRow} scoreNotes={scoreEntry?.notes} />
      </td>
    </tr>
    );
  });
}

export function RowActions({ route, row, onExportRow, exportingRow, scoreNotes }: { route: RouteConfig; row: Record<string, unknown>; onExportRow?: (id: string) => void; exportingRow?: boolean; scoreNotes?: ScoreNotes }) {
  const user = useAuthStore((state) => state.user);
  const embedded = useEmbeddedResource();
  const id = getResourceId(route, row);
  if (!id) return <span className="text-xs text-muted">-</span>;

  // Chỉ xuất PDF cho chứng nhận đã duyệt.
  const canExportRow = Boolean(onExportRow) && route.kind === "certificates" && (row.approvalStatus === "APPROVED" || row.certificateApprovalStatus === "APPROVED");

  // Khóa quá khứ sửa ở form riêng (chỉ tài khoản được cấp quyền create_past).
  const pastCourseRow = route.kind === "courses" && row.pastCourse === true;
  const editHref = pastCourseRow ? `/training/courses/past/${encodeURIComponent(id)}/edit` : fillRoute(route.editPath, { id });
  const detailHref = fillRoute(route.detailPath, { id });
  const scoreHref = fillRoute(route.actions?.score?.route, { id });
  const canView = canUseAction(user, route.actions?.view);
  // Khóa bị vô hiệu hóa (đang xem danh sách khóa hoặc đang ở trong khóa đó): chỉ xem, không thao tác gì (BE cũng chặn).
  const courseDisabled = embedded?.courseDisabled === true || (route.kind === "courses" && row.status === false);
  const canEdit = (pastCourseRow ? hasPermissionPrefix(user, "training.course.create_past.") : canShowEditAction(route, row, user)) && !courseDisabled;
  const canToggle = canUseAction(user, route.actions?.toggle) && canToggleRow(route, row, user);
  // Đặt lại mật khẩu tạm: chỉ tài khoản đang hoạt động, không phải chính mình hay SUPER_ADMIN (BE kiểm tra lại phạm vi và vai trò).
  const canResetPassword = route.kind === "accounts" && canUseAction(user, route.actions?.resetPassword) && canResetPasswordRow(row, user);
  // Phân quyền vai trò / tài khoản: thu hồi từng quyền (vĩnh viễn) thay cho bật/tắt; quyền đã thu hồi hoặc hết hạn thì không còn nút.
  const canRevokePermission =
    (route.kind === "role-permissions" || route.kind === "account-permissions") &&
    canUseAction(user, route.actions?.revoke) &&
    !isPermanentlyRevokedAssignment(route, row) &&
    // BE tính theo phân cấp: quyền do super-admin/hệ thống cấp, vai trò/tài khoản của chính mình hoặc cấp cao hơn thì không thu hồi được.
    row.revocable === true;
  // Tab chấm điểm nhập điểm trực tiếp trên bảng nên không cần nút chấm điểm ở từng hàng.
  const canScore = canUseAction(user, route.actions?.score) && embedded?.canScoreCourse !== false && ownsRowCourse(route, row, user, "score") && route.moduleName !== "training.score" && !courseDisabled;
  // Hồ sơ tham dự chỉ duyệt/từ chối khi đang chờ duyệt.
  const awaitingApproval = (route.kind !== "participations" && route.kind !== "certificates") || isAwaitingApproval(row);
  // Chỉ người gửi đăng ký mới thu hồi được, và chỉ khi hồ sơ còn chờ duyệt (chưa duyệt hoặc từ chối).
  const actorId = user?.leaderId || user?.username;
  const canWithdraw = canUseAction(user, route.actions?.withdraw) && Boolean(actorId) && row.createdBy === actorId && isAwaitingApproval(row) && !courseDisabled;
  // Khóa đã kết thúc thì không duyệt/từ chối chứng nhận được, chỉ xuất PDF.
  const courseFinished = (route.kind === "certificates" || route.kind === "participations") && row.courseFinished === true && row.coursePast !== true;
  const reapprovable = route.kind === "participations" && isReapprovable(row);
  const canApprove = canUseAction(user, route.actions?.approve) && embedded?.canApproveCourse !== false && ownsRowCourse(route, row, user, "approve") && (awaitingApproval || reapprovable) && !courseFinished && !courseDisabled;
  // Hồ sơ đã có chứng nhận được duyệt thì không xóa được.
  // Khóa quá khứ: xóa học viên nhập nhầm bằng quyền create_past (endpoint riêng của khóa quá khứ).
  const canRemovePast = route.kind === "participations" && row.coursePast === true && hasPermissionPrefix(user, "training.course.create_past.");
  const canRemove = (canRemovePast || (canUseAction(user, route.actions?.remove) && embedded?.canApproveCourse !== false && ownsRowCourse(route, row, user, "approve"))) && row.certificateApprovalStatus !== "APPROVED" && row.approvalStatus !== "REJECTED" && !courseFinished && !courseDisabled;
  const canReject = canUseAction(user, route.actions?.reject) && embedded?.canApproveCourse !== false && ownsRowCourse(route, row, user, "approve") && awaitingApproval && !courseFinished && !courseDisabled;
  // Chỉ thu hồi được chứng nhận đã duyệt (kể cả khi khóa đã kết thúc).
  const canRevoke = canUseAction(user, route.actions?.revoke) && route.kind === "certificates" && row.approvalStatus === "APPROVED" && !courseDisabled;
  // Cấp lại chứng nhận bị thu hồi vì lý do khác; chứng nhận thu hồi do khóa bị vô hiệu hóa chỉ mở lại khi bật lại khóa.
  const canReissue =
    canUseAction(user, route.actions?.reissue) && route.kind === "certificates" && row.approvalStatus === "REVOKED" && row.revocationSource !== "COURSE_DISABLED" && !courseDisabled;

  return (
    <div className="inline-flex items-center gap-1">
      {scoreNotes ? <ScoreNoteAction notes={scoreNotes} row={row} rowId={id} /> : null}
      {scoreNotes && canUseAction(user, route.actions?.score) && embedded?.canScoreCourse !== false && ownsRowCourse(route, row, user, "score") && !courseDisabled && canCreateExceptionCertificate(row) ? (
        <ExceptionCertificateAction row={row} rowId={id} />
      ) : null}
      {canView ? (
        <Tip label="Xem chi tiết hồ sơ">
          <Button asChild aria-label="Xem chi tiết" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
            <Link href={(detailHref ?? resourceActionHref(route.path, embedded, { detail: id })) as Route}>
              <EyeIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canEdit && editHref ? (
        <Tip label="Chỉnh sửa thông tin">
          <Button asChild aria-label="Sửa" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
            <Link href={editHref as Route}>
              <PencilSimpleIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {route.kind === "courses" && canEdit && !courseDisabled ? <RegistrationToggleButton endpoint={route.endpoint ?? ""} id={id} row={row} /> : null}
      {canScore && scoreHref ? (
        <Tip label="Chấm điểm hồ sơ này">
          <Button asChild aria-label="Chấm điểm" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
            <Link href={withReturnTo(scoreHref, embedded) as Route}>
              <PencilSimpleIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canApprove ? (
        <Tip label={reapprovable ? "Duyệt lại hồ sơ bị từ chối" : "Duyệt hồ sơ này"}>
          <Button asChild aria-label={reapprovable ? "Duyệt lại" : "Duyệt"} className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
            <Link href={resourceActionHref(route.path, embedded, { approve: id }) as Route}>
              <CheckCircleIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canWithdraw ? (
        <Tip label="Thu hồi đăng ký">
          <Button asChild aria-label="Thu hồi đăng ký" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
            <Link href={resourceActionHref(route.path, embedded, { withdraw: id }) as Route}>
              <ArrowUUpLeftIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canRemove ? (
        <Tip label="Chuyển về từ chối duyệt (không xóa hẳn hồ sơ)">
          <Button asChild aria-label="Chuyển về từ chối duyệt" className="h-8 min-w-8 rounded-lg text-danger" size="icon" variant="icon">
            <Link href={resourceActionHref(route.path, embedded, { remove: id }) as Route}>
              <TrashIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canReject ? (
        <Tip label="Từ chối hồ sơ này, bắt buộc nhập lý do">
          <Button asChild aria-label="Từ chối" className="h-8 min-w-8 rounded-lg text-danger" size="icon" variant="icon">
            <Link href={resourceActionHref(route.path, embedded, { reject: id }) as Route}>
              <XCircleIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canRevoke ? (
        <Tip label="Thu hồi chứng nhận, hồ sơ khóa liên kết sẽ thành không đạt">
          <Button asChild aria-label="Thu hồi chứng nhận" className="h-8 min-w-8 rounded-lg text-danger" size="icon" variant="icon">
            <Link href={resourceActionHref(route.path, embedded, { revoke: id }) as Route}>
              <ProhibitInsetIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canReissue ? (
        <Tip label="Cấp lại chứng nhận đã thu hồi, hồ sơ trở lại đạt và thăng cấp lại">
          <Button asChild aria-label="Cấp lại chứng nhận" className="h-8 min-w-8 rounded-lg text-success" size="icon" variant="icon">
            <Link href={resourceActionHref(route.path, embedded, { reissue: id }) as Route}>
              <ArrowsCounterClockwiseIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canExportRow ? (
        <Tip label="Xuất PDF chứng nhận này">
          <Button aria-label="Xuất PDF" className="h-8 min-w-8 rounded-lg" disabled={exportingRow} onClick={() => onExportRow?.(id)} size="icon" type="button" variant="icon">
            <FilePdfIcon size={16} />
          </Button>
        </Tip>
      ) : null}
      {canRevokePermission ? (
        <Tip label="Thu hồi quyền này">
          <Button asChild aria-label="Thu hồi quyền" className="h-8 min-w-8 rounded-lg text-danger" size="icon" variant="icon">
            <Link href={resourceActionHref(route.path, embedded, { revokePermission: id }) as Route}>
              <ProhibitInsetIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canResetPassword ? (
        <Tip label="Đặt lại mật khẩu, gửi mật khẩu tạm qua email">
          <Button asChild aria-label="Đặt lại mật khẩu" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
            <Link href={resourceActionHref(route.path, embedded, { resetPassword: id }) as Route}>
              <KeyIcon size={16} />
            </Link>
          </Button>
        </Tip>
      ) : null}
      {canToggle ? (
        <Tip label="Bật hoặc tắt trạng thái hoạt động">
          <StatusSwitch active={isToggleActive(route, row)} href={resourceActionHref(route.path, embedded, { toggle: id }) as Route} />
        </Tip>
      ) : null}
    </div>
  );
}

export function canShowEditAction(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  return canUseAction(user, route.actions?.edit) && canEditRow(route, row, user);
}

function canShowToggleSwitch(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  return Boolean(getResourceId(route, row)) && !isPermanentlyRevokedAssignment(route, row) && canUseAction(user, route.actions?.toggle) && canToggleRow(route, row, user);
}

function isToggleActive(route: RouteConfig, row: Record<string, unknown>) {
  return row.status === true;
}

function StatusSwitch({ active, href }: { active: boolean; href: Route }) {
  return (
    <Link
      aria-label={active ? "Tắt trạng thái" : "Bật trạng thái"}
      data-switch
      className={`inline-flex h-7 w-12 items-center rounded-full border px-0.5 transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active
          ? "justify-end border-(--toggle-active) bg-(--toggle-active-surface) hover:bg-(--toggle-active-surface-hover)"
          : "justify-start border-(--toggle-inactive) bg-(--toggle-inactive-surface) hover:bg-(--toggle-inactive-surface-hover)"
      }`}
      href={href}
    >
      <span className={`block h-5 w-5 rounded-full shadow-sm ${active ? "bg-(--toggle-active)" : "bg-(--toggle-thumb)"}`} />
    </Link>
  );
}

function LeaderIdentity({ row }: { row: Record<string, unknown> }) {
  const holyName = typeof row.holyName === "string" ? row.holyName.trim() : "";
  const fullName = typeof row.fullName === "string" ? row.fullName : "";
  const code = typeof row.email === "string" ? row.email : "";
  const displayName = `${holyName} ${fullName}`.trim();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={fullName || holyName} src={row.imageThumbUrl ?? row.imageUrl} />
      <div className="min-w-0">
        <p className="wrap-break-word text-sm font-semibold text-foreground">{displayName || "—"}</p>
        {code ? <p className="truncate text-xs text-muted">{code}</p> : null}
      </div>
    </div>
  );
}

// Danh sách hồ sơ của tài khoản nhiều vai trò gồm cả hồ sơ của giáo xứ mình trong khóa thuộc cấp khác: chỉ duyệt/chấm điểm
// hồ sơ của khóa thuộc đúng cấp quản lý của tài khoản (BE cũng kiểm tra). Dòng không mang thông tin chủ khóa thì theo quyền chung.
export function ownsRowCourse(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null, action: CourseAction) {
  if (route.kind !== "participations") return true;
  if (!row.managementUnitType && !row.courseDioceseId && !row.courseDeaneryId) return true;
  return canActOnCourse(user, { managementUnitType: row.managementUnitType, dioceseId: row.courseDioceseId, deaneryId: row.courseDeaneryId }, action);
}
