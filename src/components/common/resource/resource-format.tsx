import { auditOperationLabel, auditOperationTone, auditStatusText, auditStatusTone, auditTargetText } from "./audit-log-labels";
import {
  organizingStateLabels,
  organizingStateTones,
  registrationStateLabels,
  registrationStateTones,
  resolveOrganizingState,
  resolveRegistrationState,
} from "@/modules/training-courses/registration-state";
import type React from "react";
import { formatVietnamDateValue } from "@/lib/date-format";
import { cn, viNumber } from "@/lib/utils";
import { leaderLevelName } from "@/modules/leader-levels/leader-level-store";
import { formatPermissionTaxonomyValue, permissionTaxonomyKindFromColumn } from "./permission-taxonomy-labels";

export const columnLabels: Record<string, string> = {
  action: "Hành động",
  actionCode: "Thao tác",
  associationName: "Hiệp đoàn",
  approvedAt: "Ngày duyệt",
  approvedParticipantCount: "Số sa mạc sinh",
  approvedBy: "Người duyệt",
  approvalReason: "Lý do duyệt",
  approvalReasonRequired: "Cần lý do duyệt",
  approvalStatus: "Trạng thái duyệt",
  assignedAt: "Ngày gán",
  assignedBy: "Người gán",
  authProvider: "Nguồn đăng nhập",
  birthDate: "Ngày sinh",
  certificateApprovalStatus: "Duyệt chứng nhận",
  finalResult: "Kết quả khóa",
  certificateRequestedAt: "Ngày yêu cầu chứng nhận",
  certificateApprovedAt: "Ngày duyệt chứng nhận",
  componentScores: "Điểm thành phần",
  revokedAt: "Ngày thu hồi",
  revokedBy: "Người thu hồi",
  revocationReason: "Lý do thu hồi",
  parishSubmittedAt: "Ngày gửi đăng ký",
  review: "Ghi chú",
  scoreNote: "Nhận xét",
  certificateCode: "Mã chứng nhận",
  certificateName: "Tên chứng nhận",
  chaplain: "Tuyên úy",
  chapterName: "Xứ đoàn",
  code: "Mã",
  conditions: "Điều kiện",
  courseCode: "Mã khóa",
  courseName: "Khóa",
  courseType: "Loại khóa",
  courseTypeCode: "Loại khóa",
  courseTypeName: "Tên loại khóa",
  typeCode: "Mã loại khóa",
  typeName: "Tên loại khóa",
  managementUnitType: "Cấp quản lý",
  prerequisiteTypeCode: "Khóa tiên quyết",
  prerequisiteTypeName: "Khóa tiên quyết",
  resultingLevel: "Cấp độ khi đạt",
  courseResultingLevel: "Cấp độ đạt được của khóa",
  targetLevel: "Cấp độ đạt được (ngoại lệ)",
  certificateShortCode: "Mã viết tắt chứng chỉ",
  createdAt: "Ngày tạo",
  createdBy: "Người tạo",
  deaneryCount: "Số giáo hạt",
  deaneryId: "Giáo hạt",
  deaneryName: "Giáo hạt",
  description: "Mô tả",
  dioceseId: "Giáo phận",
  dioceseName: "Giáo phận",
  displayOrder: "Thứ tự",
  validity: "Tình trạng quyền",
  eligible:"Đủ điều kiện",
  email: "Email",
  endDate: "Ngày kết thúc",
  establishmentDate: "Ngày thành lập",
  eventType: "Sự kiện",
  expiresAt: "Hết hạn",
  expression: "Biểu thức",
  exceptionReason:"Lí do đặc cách",
  firstName: "Tên",
  fullName: "Họ tên",
  gender: "Giới tính",
  holyName: "Tên thánh",
  hostYear: "Năm",
  yearsActive: "Số năm hoạt động",
  imageUrl: "Ảnh",
  ipAddress: "IP",
  isPrimary: "Vai trò chính",
  isSystem: "Vai trò hệ thống",
  lastName: "Họ",
  leaderDeaneryName: "Giáo hạt",
  leaderFullName: "Huynh trưởng",
  leaderParishName: "Giáo xứ",
  leaderCount: "Số Huynh trưởng",
  leaderId: "Huynh trưởng",
  leaderLevel: "Cấp HT",
  location: "Địa điểm",
  locked: "Khóa",
  loggedAt: "Thời gian",
  maxScore: "Điểm tối đa",
  coefficient: "Hệ số",
  recipientUsernames: "Tài khoản nhận danh sách đăng ký",
  registrationOpen: "Đang mở đăng ký",
  registrationStatus: "Trạng thái đăng ký",
  organizingStatus: "Trạng thái tổ chức",
  includeInFinal: "Tính điểm tổng kết",
  moduleCode: "Module",
  name: "Tên",
  parishId: "Giáo xứ",
  parishCount: "Số giáo xứ",
  parishName: "Giáo xứ",
  participationStatus: "Trạng thái tham dự",
  teamName: "Đội",
  leaderGender: "Giới tính",
  passed: "Kết quả",
  passingScore: "Điểm đạt",
  scoreLocked: "Khóa chỉnh sửa điểm",
  autoApproveEligible: "Tự động duyệt hồ sơ hợp lệ",
  attendanceEnabled: "Bật điểm danh bằng QR",
  autoSendInvitation: "Tự gửi email khi duyệt",
  scoreVisible: "Hiển thị điểm của khóa",
  patronSaintDay: "Ngày bổn mạng",
  permissionCode: "Mã quyền",
  permissionName: "Tên quyền",
  phoneNumber: "SĐT",
  positionCode: "Mã chức vụ",
  positionName: "Chức vụ",
  positionType: "Cấp áp dụng",
  primaryRoleCode: "Vai trò chính",
  primaryRoleName: "Vai trò chính",
  providerId: "Mã nhà cung cấp",
  readAt: "Đã đọc",
  reason: "Lý do",
  registrationEndAt: "Hết đăng ký",
  registrationDate: "Ngày đăng ký",
  registrationStartAt: "Mở đăng ký",
  requiredCurrentLevel: "Cấp yêu cầu",
  requiredMinAge: "Tuổi tối thiểu",
  requiredYearsActive: "Số năm sinh hoạt",
  maxYearsAfterPrerequisite: "Thời hạn tối đa sau khóa tiên quyết (năm)",
  requirementCode: "Mã điều kiện",
  requirementName: "Điều kiện",
  resourceCode: "Đối tượng",
  resourceType: "Đối tượng",
  resource: "Đối tượng",
  resourceName: "Tên / mã đối tượng",
  resourceId: "Mã đối tượng",
  operation: "Thao tác",
  statusCode: "Kết quả",
  durationMs: "Thời gian xử lý",
  queryString: "Bộ lọc yêu cầu",
  result: "Kết quả",
  roleCode: "Mã vai trò",
  roleCodes: "Mã vai trò",
  roleName: "Vai trò",
  roleNames: "Vai trò",
  scopeCode: "Phạm vi",
  secondaryRoleNames: "Vai trò phụ",
  startDate: "Ngày bắt đầu",
  status: "Trạng thái",
  title: "Tiêu đề",
  totalScore: "Tổng điểm",
  unionName: "Liên đoàn",
  unitId: "Đơn vị",
  unitName: "Đơn vị",
  unitType: "Loại đơn vị",
  updatedAt: "Ngày cập nhật",
  updatedBy: "Người cập nhật",
  username: "Tài khoản",
};

const genderLabels: Record<string, string> = {
  NAM: "Nam",
  NU: "Nữ",
};

const unitTypeLabels: Record<string, string> = {
  DIOCESE: "Giáo phận",
  DEANERY: "Giáo hạt",
  PARISH: "Giáo xứ",
  // NONE: "Chưa có cấp",
};

const leaderLevelColumns = new Set(["requiredCurrentLevel", "resultingLevel", "courseResultingLevel", "targetLevel"]);

export function formatLeaderLevel(value: string) {
  return leaderLevelName(value);
}

type ResourceCellProps = {
  column: string;
  row: Record<string, unknown>;
  value: unknown;
  displayMode?: "table" | "detail";
};

export function ResourceCell({ column, row, value, displayMode = "table" }: ResourceCellProps) {
  const full = displayMode === "detail";
  if (column === "leaderFullName" && typeof value === "string" && typeof row.leaderHolyName === "string" && row.leaderHolyName.trim()) {
    return <TextValue full={full}>{`${row.leaderHolyName.trim()} ${value}`}</TextValue>;
  }
  if (column === "resource" && typeof value === "string") return <TextValue full={full}>{formatPermissionTaxonomyValue("resource", value) ?? value}</TextValue>;
  if (column === "resourceName") {
    const target = auditTargetText(row);
    return target ? <TextValue full={full}>{target}</TextValue> : <span className="text-muted">Không áp dụng</span>;
  }
  if (column === "operation" && typeof value === "string") return <Badge tone={auditOperationTone(value)}>{auditOperationLabel(value)}</Badge>;
  if (column === "statusCode" && typeof value === "number") return <Badge tone={auditStatusTone(value)}>{`${value} · ${auditStatusText(value)}`}</Badge>;
  if (column === "durationMs" && typeof value === "number") return <TextValue full={full}>{`${viNumber.format(value)} ms`}</TextValue>;
  if (column === "imageUrl") return <Avatar name={String(row.fullName ?? row.leaderFullName ?? row.username ?? "")} src={value} />;
  if (column === "status" && value === true && row.effectiveStatus === false) return <Badge tone="warning">Ngưng theo đơn vị cha</Badge>;
  if (column === "status" && typeof value === "boolean") return <StatusBadge active={value} />;
  if (column === "validity" && typeof value === "string") return <PermissionValidityBadge validity={value} />;
  if ((column === "gender" || column === "leaderGender") && typeof value === "string") return <TextValue full={full}>{genderLabels[value] ?? value}</TextValue>;
  if (["moduleCode", "resourceCode", "actionCode", "scopeCode"].includes(column) && typeof value === "string") {
    return <TextValue full={full}>{formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn(column), value) ?? value}</TextValue>;
  }
  if (column === "leaderLevel" && typeof value === "string") return <LeaderLevelBadge value={value} />;
  if (leaderLevelColumns.has(column) && typeof value === "string") return <TextValue full={full}>{formatLeaderLevel(value)}</TextValue>;
  if (typeof value === "string" && unitTypeLabels[value]) return <TextValue full={full}>{unitTypeLabels[value]}</TextValue>;
  if (column === "registrationStatus" && typeof value === "string") {
    const state = resolveRegistrationState(row);
    return <Badge tone={registrationStateTones[state]}>{registrationStateLabels[state]}</Badge>;
  }
  if (column === "organizingStatus" && typeof value === "string") {
    const state = resolveOrganizingState(row);
    return <Badge tone={organizingStateTones[state]}>{organizingStateLabels[state]}</Badge>;
  }
  if (column === "finalResult") {
    if (value === "PASSED") return <Badge tone="success">Đạt, được thăng cấp</Badge>;
    if (value === "FAILED") return <Badge tone="danger">Không đạt</Badge>;
    return <span className="text-muted">Chưa kết thúc</span>;
  }
  if (column === "passed" && typeof value === "boolean") return <Badge tone={value ? "success" : "danger"}>{value ? "Đạt" : "Chưa đạt"}</Badge>;
  if (column === "locked" && typeof value === "boolean") return <Badge tone={value ? "warning" : "neutral"}>{value ? "Đã khóa" : "Có thể sửa"}</Badge>;
  if (typeof value === "string") {
    const formattedDate = formatVietnamDateValue(value);
    if (formattedDate) return <TextValue full={full}>{formattedDate}</TextValue>;
  }
  if (column.toLowerCase().includes("status") && typeof value === "string") return <WorkflowBadge value={value} />;
  if (Array.isArray(value)) return <ArrayValue values={value} />;
  if (typeof value === "string" || typeof value === "number") {
    const relatedValue = resolveRelatedDisplayValue(column, row);
    if (relatedValue !== undefined) return <TextValue full={full}>{relatedValue}</TextValue>;
  }
  if (typeof value === "boolean") return <Badge tone={value ? "success" : "neutral"}>{value ? "Có" : "Không"}</Badge>;
  if (value === null || value === undefined || value === "") return <span className="text-muted">Chưa có</span>;
  if (typeof value === "number") return viNumber.format(value);
  return <TextValue full={full}>{String(value)}</TextValue>;
}

function TextValue({ children, full }: { children: React.ReactNode; full: boolean }) {
  return <span className={full ? "whitespace-pre-wrap wrap-break-word" : "line-clamp-1 max-w-65"}>{children}</span>;
}

function ArrayValue({ values }: { values: unknown[] }) {
  const labels = values.map((value) => String(value)).filter((value) => value.trim());
  if (!labels.length) return <span className="text-muted">Không có</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <Badge key={label}>{label}</Badge>
      ))}
    </span>
  );
}

function resolveRelatedDisplayValue(column: string, row: Record<string, unknown>) {
  const relatedField =
    column === "deaneryId" ? "deaneryName"
    : column === "dioceseId" ? "dioceseName"
    : column === "parishId" ? "parishName"
    : column === "unitId" ? "unitName"
    : undefined;
  const relatedValue = relatedField ? row[relatedField] : undefined;
  if (typeof relatedValue === "string" && relatedValue.trim()) return relatedValue;
  return undefined;
}

export function Avatar({ name, src }: { name: string; src: unknown }) {
  const initial = name.trim().charAt(0).toUpperCase() || "H";
  if (typeof src === "string" && src) {
    return (
      <span
        aria-label={name || "Ảnh đại diện"}
        className="inline-flex h-9 w-9 shrink-0 rounded-full border border-border bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${src})` }}
      />
    );
  }
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
      {initial}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? "Đang hoạt động" : "Tạm ngưng"}</Badge>;
}

const permissionValidityLabels: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  ACTIVE: { label: "Còn hiệu lực", tone: "success" },
  EXPIRED: { label: "Đã hết hạn (thu hồi)", tone: "danger" },
  REVOKED: { label: "Đã thu hồi", tone: "danger" },
  PERMISSION_DISABLED: { label: "Quyền đang bị vô hiệu hóa", tone: "warning" },
};

function PermissionValidityBadge({ validity }: { validity: string }) {
  const meta = permissionValidityLabels[validity];
  return <Badge tone={meta?.tone ?? "neutral"}>{meta?.label ?? validity}</Badge>;
}

function WorkflowBadge({ value }: { value: string }) {
  const tone = value.includes("APPROVED") || value.includes("COMPLETED") ? "success" : value.includes("REJECTED") || value.includes("REVOKED") ? "danger" : "warning";
  const label = value
    .replace("APPROVED", "Đã duyệt")
    .replace("REJECTED", "Từ chối")
    .replace("REVOKED", "Đã thu hồi")
    .replace("PENDING", "Chờ xử lý")
    .replace("SUBMITTED", "Đã gửi")
    .replace("COMPLETED", "Hoàn thành")
    .replace("UNCOMPLETED", "Chưa hoàn thành")
    .replace("REGISTERED", "Đã đăng ký")
    .replace("ATTENDED", "Đã tham dự")
    .replace("CANCELLED", "Đã hủy")
    .replace("NOT_REQUIRED", "Không yêu cầu");
  return <Badge tone={tone}>{label}</Badge>;
}

function LeaderLevelBadge({ value }: { value: string }) {
  const label = formatLeaderLevel(value);
  const className =
    value === "HT_II"
      ? "border-transparent bg-[var(--badge-level-mid-bg)] text-[var(--badge-level-mid-fg)]"
      : value === "HT_III" || value.startsWith("HLV_")
        ? "border-transparent bg-[var(--badge-level-high-bg)] text-[var(--badge-level-high-fg)]"
        : "border-transparent bg-[var(--badge-level-low-bg)] text-[var(--badge-level-low-fg)]";

  return <Badge className={className}>{label}</Badge>;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tone === "neutral" && "border-transparent bg-surface-2 text-text-secondary",
        tone === "success" && "border-transparent bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]",
        tone === "danger" && "border-transparent bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]",
        tone === "warning" && "border-transparent bg-[var(--badge-warning-bg)] text-[var(--badge-warning-fg)]",
        tone === "info" && "border-transparent bg-[var(--badge-level-mid-bg)] text-[var(--badge-level-mid-fg)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
