import type React from "react";
import { formatVietnamDateValue } from "@/lib/date-format";
import { cn, viNumber } from "@/lib/utils";
import { formatPermissionTaxonomyValue, permissionTaxonomyKindFromColumn } from "./permission-taxonomy-labels";

export const columnLabels: Record<string, string> = {
  action: "Hành động",
  actionCode: "Thao tác",
  associationName: "Hiệp đoàn",
  approvedAt: "Ngày duyệt",
  approvedBy: "Người duyệt",
  approvalReason: "Lý do duyệt",
  approvalReasonRequired: "Cần lý do duyệt",
  approvalStatus: "Trạng thái duyệt",
  assignedAt: "Ngày gán",
  assignedBy: "Người gán",
  authProvider: "Nguồn đăng nhập",
  birthDate: "Ngày sinh",
  certificateApprovalStatus: "Duyệt chứng nhận",
  certificateCode: "Mã chứng nhận",
  certificateName: "Tên chứng nhận",
  chaplain: "Tuyên úy",
  chapterName: "Xứ đoàn",
  code: "Mã",
  conditions: "Điều kiện",
  courseCode: "Mã khóa",
  courseName: "Khóa",
  courseType: "Loại khóa",
  createdAt: "Ngày tạo",
  createdBy: "Người tạo",
  deaneryApprovalStatus: "Duyệt giáo hạt",
  deaneryCount: "Số giáo hạt",
  deaneryId: "Giáo hạt",
  deaneryName: "Giáo hạt",
  description: "Mô tả",
  dioceseApprovalStatus: "Duyệt giáo phận",
  dioceseId: "Giáo phận",
  dioceseName: "Giáo phận",
  displayOrder: "Thứ tự",
  effect: "Hiệu lực",
  email: "Email",
  endDate: "Ngày kết thúc",
  establishmentDate: "Ngày thành lập",
  eventType: "Sự kiện",
  expiresAt: "Hết hạn",
  expression: "Biểu thức",
  firstName: "Tên",
  fullName: "Họ tên",
  gender: "Giới tính",
  holyName: "Tên thánh",
  hostYear: "Năm",
  imageUrl: "Ảnh",
  ipAddress: "IP",
  isPrimary: "Vai trò chính",
  isSystem: "Vai trò hệ thống",
  lastName: "Họ",
  leaderFullName: "Huynh trưởng",
  leaderCount: "Số Huynh trưởng",
  leaderId: "Huynh trưởng",
  leaderLevel: "Cấp HT",
  location: "Địa điểm",
  locked: "Khóa",
  loggedAt: "Thời gian",
  maxScore: "Điểm tối đa",
  moduleCode: "Module",
  name: "Tên",
  parishId: "Giáo xứ",
  parishCount: "Số giáo xứ",
  parishName: "Giáo xứ",
  participationStatus: "Trạng thái tham dự",
  passed: "Kết quả",
  passingScore: "Điểm đạt",
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
  requirementCode: "Mã điều kiện",
  requirementName: "Điều kiện",
  resourceCode: "Đối tượng",
  resourceType: "Đối tượng",
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

const levelLabels: Record<string, string> = {
  NONE: "Chưa có cấp",
  HT_XU: "Huynh trưởng xứ",
  DU_TRUONG: "Dự trưởng",
  HT_I: "Huynh trưởng cấp I",
  HT_II: "Huynh trưởng cấp II",
  HT_III: "Huynh trưởng cấp III",
  HLV_I: "Huấn luyện viên cấp I",
  HLV_II: "Huấn luyện viên cấp II",
  HLV_III: "Huấn luyện viên cấp III",
};

const genderLabels: Record<string, string> = {
  NAM: "Nam",
  NU: "Nữ",
};

export function formatLeaderLevel(value: string) {
  return levelLabels[value] ?? value;
}

type ResourceCellProps = {
  column: string;
  row: Record<string, unknown>;
  value: unknown;
  displayMode?: "table" | "detail";
};

export function ResourceCell({ column, row, value, displayMode = "table" }: ResourceCellProps) {
  const full = displayMode === "detail";
  if (column === "imageUrl") return <Avatar name={String(row.fullName ?? row.leaderFullName ?? row.username ?? "")} src={value} />;
  if (column === "status" && typeof value === "boolean") return <StatusBadge active={value} />;
  if (column === "effect" && typeof value === "string") return <EffectBadge effect={value} />;
  if (column === "gender" && typeof value === "string") return <TextValue full={full}>{genderLabels[value] ?? value}</TextValue>;
  if (["moduleCode", "resourceCode", "actionCode", "scopeCode"].includes(column) && typeof value === "string") {
    return <TextValue full={full}>{formatPermissionTaxonomyValue(permissionTaxonomyKindFromColumn(column), value) ?? value}</TextValue>;
  }
  if (column === "leaderLevel" && typeof value === "string") return <LeaderLevelBadge value={value} />;
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
  return <span className={full ? "whitespace-pre-wrap break-words" : "line-clamp-1 max-w-[260px]"}>{children}</span>;
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

function Avatar({ name, src }: { name: string; src: unknown }) {
  const initial = name.trim().charAt(0).toUpperCase() || "H";
  if (typeof src === "string" && src) {
    return (
      <span
        aria-label={name || "Ảnh đại diện"}
        className="inline-flex h-10 w-10 rounded-full border border-border bg-cover bg-center shadow-sm"
        role="img"
        style={{ backgroundImage: `url(${src})` }}
      />
    );
  }
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-[var(--shadow-accent)]">
      {initial}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? "Đang hoạt động" : "Tạm ngưng"}</Badge>;
}

function EffectBadge({ effect }: { effect: string }) {
  return <Badge tone={effect === "DENY" ? "danger" : "success"}>{effect === "DENY" ? "Từ chối" : "Cho phép"}</Badge>;
}

function WorkflowBadge({ value }: { value: string }) {
  const tone = value.includes("APPROVED") || value.includes("COMPLETED") ? "success" : value.includes("REJECTED") ? "danger" : "warning";
  const label = value
    .replace("APPROVED", "Đã duyệt")
    .replace("REJECTED", "Từ chối")
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
    value === "HT_XU"
      ? "border-amber-400 bg-white text-danger"
      : value === "DU_TRUONG"
        ? "border-danger bg-danger text-white"
        : value.startsWith("HT_")
          ? "border-amber-400 bg-danger text-white"
          : value.startsWith("HLV_")
            ? "border-purple-600 bg-purple-600 text-white"
            : undefined;

  return className ? <Badge className={className}>{label}</Badge> : <Badge>{label}</Badge>;
}

function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-[7px] border px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "border-border bg-surface-1 text-muted",
        tone === "success" && "border-success/25 bg-success/10 text-success",
        tone === "danger" && "border-danger/25 bg-danger/10 text-danger",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-700",
        className,
      )}
    >
      {children}
    </span>
  );
}
