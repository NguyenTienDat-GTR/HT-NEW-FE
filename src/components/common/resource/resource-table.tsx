"use client";

import { ArrowsCounterClockwiseIcon, ArrowUUpLeftIcon, CaretDownIcon, CheckCircleIcon, EyeIcon, FilePdfIcon, PencilSimpleIcon, ProhibitInsetIcon, TrashIcon, XCircleIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import type { RouteConfig } from "@/config/routes/routes";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { canUseAction, hasPermission, isSuperAdmin } from "@/lib/auth/permissions";
import { Avatar, columnLabels, ResourceCell } from "./resource-format";
import { useEmbeddedResource, resourceActionHref, withReturnTo } from "./embedded-resource-context";
import { fillRoute, getResourceId, isAwaitingApproval } from "./resource-actions";
import type { ScoreEntry, ScoreNotes } from "./score-entry";
import { ScoreNoteAction } from "./score-note-action";
import { RegistrationToggleButton } from "@/modules/training-courses/components/registration-toggle-button";
import type { ResourcePageSize } from "./use-resource-query-state";

const systemRoleCodes = new Set(["SUPER_ADMIN", "ADMIN_DIOCESE", "ADMIN_DEANERY", "ADMIN_PARISH"]);

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
  onExportRow,
  exportingRow,
  page = 0,
}: {
  page?: number;
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
  // Trong chi tiết khóa, bảng đã thuộc về một khóa nên không cần cột khóa.
  const visibleColumns = visibleResourceColumns(route, rows, user)
    .filter((column) => !(embedded && column === "courseName"))
    // Hồ sơ huynh trưởng: ảnh + tên thánh + họ tên gộp thành một ô nhận diện.
    .filter((column) => !(route.kind === "leaders" && (column === "imageUrl" || column === "holyName")));

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-270 border-separate border-spacing-0 text-left text-sm">
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
            {embedded ? <th className="sticky top-0 z-10 h-10 w-12 border-b border-border bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">STT</th> : null}
            {visibleColumns.map((column) => (
              <th className="sticky top-0 z-10 h-10 border-b border-border bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-text-secondary" key={column}>
                {route.sortFields?.[column] === null ? (
                  <span className="inline-flex h-8 items-center px-1">{route.kind === "leaders" && column === "fullName" ? "Huynh trưởng" : (columnLabels[column] ?? column)}</span>
                ) : (
                  <button className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-1 transition-colors hover:text-primary" onClick={() => sort(column)} type="button">
                    {route.kind === "leaders" && column === "fullName" ? "Huynh trưởng" : (columnLabels[column] ?? column)}
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
              <th className="sticky top-0 z-10 h-10 border-b border-border bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-text-secondary" key={component.id}>
                <span className="block whitespace-nowrap">{component.name}</span>
                <span className="block text-[10px] font-normal text-muted">
                  Tối đa {Number(component.maxScore)}
                  {component.includeInFinal === false ? " · không tính tổng" : ` · hệ số ${Number(component.coefficient ?? 1)}`}
                </span>
              </th>
            ))}
            <th className="h-11 border-b border-border bg-slate-50 px-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Thao tác</th>
          </tr>
        </thead>
        <tbody>{isLoading ? <ResourceTableSkeleton columns={visibleColumns} size={size} /> : <ResourceRows columns={visibleColumns} indexOffset={embedded ? page * size : undefined} route={route} rows={rows} scoreEntry={scoreEntry} selection={selection} onExportRow={onExportRow} exportingRow={exportingRow} />}</tbody>
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
  indexOffset,
  onExportRow,
  exportingRow,
}: {
  // Có giá trị thì hiển thị cột STT bắt đầu từ offset (số hàng của các trang trước).
  indexOffset?: number;
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
    return (
    <tr className="group bg-white transition-colors hover:bg-slate-50" key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}>
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
      {indexOffset !== undefined ? <td className="h-14 w-12 border-b border-slate-100 px-3 align-middle text-muted">{indexOffset + rowIndex + 1}</td> : null}
      {columns.map((column) => (
        <td className="h-14 border-b border-slate-100 px-3 align-middle" key={column}>
          {route.kind === "leaders" && column === "fullName" ? <LeaderIdentity row={row} /> : <ResourceCell column={column} row={row} value={row[column]} />}
        </td>
      ))}
      {scoreEntry?.components.map((component) => {
        const value = rowId ? scoreEntry.valueOf(rowId, row, component.id) : "";
        const editable = Boolean(rowId) && scoreEntry.isEditable(row);
        const invalid = scoreEntry.isInvalid(component, value);
        return (
          <td className="h-14 border-b border-slate-100 px-3 align-middle" key={component.id}>
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
      <td className="sticky right-0 h-14 border-b border-slate-100 bg-white px-3 text-right shadow-(--shadow-table-sticky) transition-colors group-hover:bg-slate-50">
        <RowActions route={route} row={row} onExportRow={onExportRow} exportingRow={exportingRow} scoreNotes={scoreEntry?.notes} />
      </td>
    </tr>
    );
  });
}

function RowActions({ route, row, onExportRow, exportingRow, scoreNotes }: { route: RouteConfig; row: Record<string, unknown>; onExportRow?: (id: string) => void; exportingRow?: boolean; scoreNotes?: ScoreNotes }) {
  const user = useAuthStore((state) => state.user);
  const embedded = useEmbeddedResource();
  const id = getResourceId(route, row);
  if (!id) return <span className="text-xs text-muted">-</span>;

  // Chỉ xuất PDF cho chứng nhận đã duyệt.
  const canExportRow = Boolean(onExportRow) && route.kind === "certificates" && (row.approvalStatus === "APPROVED" || row.certificateApprovalStatus === "APPROVED");

  const editHref = fillRoute(route.editPath, { id });
  const detailHref = fillRoute(route.detailPath, { id });
  const scoreHref = fillRoute(route.actions?.score?.route, { id });
  const canView = canUseAction(user, route.actions?.view);
  // Khóa bị vô hiệu hóa (đang xem danh sách khóa hoặc đang ở trong khóa đó): chỉ xem, không thao tác gì (BE cũng chặn).
  const courseDisabled = embedded?.courseDisabled === true || (route.kind === "courses" && row.status === false);
  const canEdit = canShowEditAction(route, row, user) && !courseDisabled;
  const canToggle = canUseAction(user, route.actions?.toggle) && canToggleRow(route, row, user);
  // Tab chấm điểm nhập điểm trực tiếp trên bảng nên không cần nút chấm điểm ở từng hàng.
  const canScore = canUseAction(user, route.actions?.score) && route.moduleName !== "training.score" && !courseDisabled;
  // Hồ sơ tham dự chỉ duyệt/từ chối khi đang chờ duyệt.
  const awaitingApproval = (route.kind !== "participations" && route.kind !== "certificates") || isAwaitingApproval(row);
  // Chỉ người gửi đăng ký mới thu hồi được, và chỉ khi hồ sơ còn chờ duyệt (chưa duyệt hoặc từ chối).
  const actorId = user?.leaderId || user?.username;
  const canWithdraw = canUseAction(user, route.actions?.withdraw) && Boolean(actorId) && row.createdBy === actorId && isAwaitingApproval(row) && !courseDisabled;
  // Khóa đã kết thúc thì không duyệt/từ chối chứng nhận được, chỉ xuất PDF.
  const courseFinished = route.kind === "certificates" && row.courseFinished === true;
  const canApprove = canUseAction(user, route.actions?.approve) && awaitingApproval && !courseFinished && !courseDisabled;
  // Hồ sơ đã có chứng nhận được duyệt thì không xóa được.
  const canRemove = canUseAction(user, route.actions?.remove) && row.certificateApprovalStatus !== "APPROVED" && !courseDisabled;
  const canReject = canUseAction(user, route.actions?.reject) && awaitingApproval && !courseFinished && !courseDisabled;
  // Chỉ thu hồi được chứng nhận đã duyệt (kể cả khi khóa đã kết thúc).
  const canRevoke = canUseAction(user, route.actions?.revoke) && route.kind === "certificates" && row.approvalStatus === "APPROVED" && !courseDisabled;
  // Cấp lại chứng nhận bị thu hồi vì lý do khác; chứng nhận thu hồi do khóa bị vô hiệu hóa chỉ mở lại khi bật lại khóa.
  const canReissue =
    canUseAction(user, route.actions?.reissue) && route.kind === "certificates" && row.approvalStatus === "REVOKED" && row.revocationSource !== "COURSE_DISABLED" && !courseDisabled;

  return (
    <div className="inline-flex items-center gap-1">
      {scoreNotes ? <ScoreNoteAction notes={scoreNotes} row={row} rowId={id} /> : null}
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
        <Tip label="Duyệt hồ sơ này">
          <Button asChild aria-label="Duyệt" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
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
        <Tip label="Xóa khỏi danh sách tham dự">
          <Button asChild aria-label="Xóa khỏi danh sách tham dự" className="h-8 min-w-8 rounded-lg text-danger" size="icon" variant="icon">
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
      {canToggle ? (
        <Tip label="Bật hoặc tắt trạng thái hoạt động">
          <StatusSwitch active={isToggleActive(route, row)} href={resourceActionHref(route.path, embedded, { toggle: id }) as Route} />
        </Tip>
      ) : null}
    </div>
  );
}

function canEditRow(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  if (route.kind === "accounts") return false;
  if (route.kind === "leaders") return false;
  if (route.kind === "positions") return hasScopedRowPermission(route, user, "update", row);
  if (!isSuperAdmin(user) && isSystemRoleRow(route, row)) return false;
  if (!isSuperAdmin(user)) return true;
  return route.kind !== "dioceses" && route.kind !== "deaneries" && route.kind !== "parishes";
}

export function canShowEditAction(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  return canUseAction(user, route.actions?.edit) && canEditRow(route, row, user);
}

// Chức vụ và phân công ban điều hành: chỉ thao tác trên dòng thuộc đúng cấp mình được cấp quyền.
function hasScopedRowPermission(route: RouteConfig, user: AuthUser | null, action: "update" | "toggle", row: Record<string, unknown>) {
  const level = route.kind === "positions" ? row.positionType : row.unitType;
  if (typeof level !== "string") return false;
  const resource = route.kind === "positions" ? "position" : "executive_board_assignment";
  return hasPermission(user, `organization.${resource}.${action}.${level.toLowerCase()}`);
}

function canToggleRow(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  if (route.kind === "positions") return hasScopedRowPermission(route, user, "toggle", row);
  // Phân công là lịch sử nhiệm kì: chỉ vô hiệu hóa (kết thúc) được, phân công đã kết thúc không bật lại.
  if (route.kind === "executive-board") return row.status === true && hasScopedRowPermission(route, user, "toggle", row);
  if (!isSuperAdmin(user) && isSystemRoleRow(route, row)) return false;
  if (route.kind === "accounts") return !isOwnAccount(row, user) && !rowHasPrimaryRole(row, "SUPER_ADMIN");
  if (route.kind === "dioceses") return isSuperAdmin(user);
  if (route.kind === "deaneries") return hasRole(user, "ADMIN_DIOCESE");
  // Admin giáo hạt bật/tắt giáo xứ trong giáo hạt; admin giáo phận bật/tắt giáo xứ trong giáo phận khi có quyền toggle.diocese.
  if (route.kind === "parishes") return hasRole(user, "ADMIN_DEANERY") || (hasRole(user, "ADMIN_DIOCESE") && hasPermission(user, "organization.parish.toggle.diocese"));
  if (!isSuperAdmin(user)) return true;
  return route.kind === "permissions" || route.kind === "account-roles";
}

function isSystemRoleRow(route: RouteConfig, row: Record<string, unknown>) {
  if (route.kind === "roles") return row.isSystem === true;
  if (route.kind !== "role-permissions") return false;
  return row.roleIsSystem === true || (typeof row.roleCode === "string" && systemRoleCodes.has(row.roleCode));
}

function isOwnAccount(row: Record<string, unknown>, user: AuthUser | null) {
  return typeof row.username === "string" && row.username === user?.username;
}

function rowHasPrimaryRole(row: Record<string, unknown>, roleCode: string) {
  return row.primaryRoleCode === roleCode;
}

function hasRole(user: AuthUser | null, roleCode: string) {
  return Boolean(user?.roles.some((role) => role === roleCode || role === `ROLE_${roleCode}`));
}

function canShowToggleSwitch(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  return Boolean(getResourceId(route, row)) && canUseAction(user, route.actions?.toggle) && canToggleRow(route, row, user);
}

function isToggleActive(route: RouteConfig, row: Record<string, unknown>) {
  if (route.kind === "role-permissions" || route.kind === "account-permissions") {
    return row.effect !== "DENY";
  }
  return row.status === true;
}

function StatusSwitch({ active, href }: { active: boolean; href: Route }) {
  return (
    <Link
      aria-label={active ? "Tắt trạng thái" : "Bật trạng thái"}
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
      <Avatar name={fullName || holyName} src={row.imageUrl} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{displayName || "—"}</p>
        {code ? <p className="truncate text-xs text-muted">{code}</p> : null}
      </div>
    </div>
  );
}
