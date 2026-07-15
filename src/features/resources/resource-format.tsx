import type React from "react";
import { cn, viNumber } from "@/lib/utils";

export const columnLabels: Record<string, string> = {
  action: "Hành động",
  actionCode: "Action",
  approvalStatus: "Duyệt",
  assignedAt: "Ngày gán",
  certificateApprovalStatus: "Chứng nhận",
  certificateCode: "Mã chứng nhận",
  chaplain: "Tuyên úy",
  chapterName: "Xứ đoàn",
  code: "Mã",
  courseCode: "Mã khóa",
  courseName: "Khóa",
  courseType: "Loại khóa",
  createdAt: "Ngày tạo",
  deaneryId: "Giáo hạt",
  deaneryName: "Giáo hạt",
  description: "Mô tả",
  dioceseId: "Giáo phận",
  dioceseName: "Giáo phận",
  displayOrder: "Thứ tự",
  effect: "Effect",
  email: "Email",
  endDate: "Ngày kết thúc",
  eventType: "Sự kiện",
  expiresAt: "Hết hạn",
  expression: "Biểu thức",
  fullName: "Họ tên",
  gender: "Giới tính",
  holyName: "Tên thánh",
  hostYear: "Năm",
  imageUrl: "Ảnh",
  ipAddress: "IP",
  isPrimary: "Chính",
  isSystem: "Hệ thống",
  leaderFullName: "Huynh trưởng",
  leaderLevel: "Cấp HT",
  location: "Địa điểm",
  locked: "Khóa",
  loggedAt: "Thời gian",
  maxScore: "Điểm tối đa",
  moduleCode: "Module",
  name: "Tên",
  parishId: "Giáo xứ",
  parishName: "Giáo xứ",
  passed: "Kết quả",
  passingScore: "Điểm đạt",
  permissionCode: "Mã quyền",
  permissionName: "Tên quyền",
  phoneNumber: "SĐT",
  positionCode: "Mã chức vụ",
  positionName: "Chức vụ",
  positionType: "Cấp áp dụng",
  primaryRoleCode: "Vai trò",
  readAt: "Đã đọc",
  reason: "Lý do",
  registrationEndAt: "Hết đăng ký",
  requiredCurrentLevel: "Cấp yêu cầu",
  requiredMinAge: "Tuổi tối thiểu",
  requirementCode: "Mã điều kiện",
  requirementName: "Điều kiện",
  resourceCode: "Resource",
  resourceType: "Đối tượng",
  roleCode: "Mã vai trò",
  roleName: "Vai trò",
  scopeCode: "Scope",
  startDate: "Ngày bắt đầu",
  status: "Trạng thái",
  title: "Tiêu đề",
  totalScore: "Tổng điểm",
  unionName: "Liên đoàn",
  unitId: "Đơn vị",
  unitType: "Loại đơn vị",
  username: "Tài khoản",
};

const levelLabels: Record<string, string> = {
  NONE: "Chưa có cấp",
  HT_XU: "HT xứ",
  DU_TRUONG: "Dự trưởng",
  HT_I: "HT cấp I",
  HT_II: "HT cấp II",
  HT_III: "HT cấp III",
  HLV_I: "HLV cấp I",
  HLV_II: "HLV cấp II",
  HLV_III: "HLV cấp III",
};

export function ResourceCell({ column, row, value }: { column: string; row: Record<string, unknown>; value: unknown }) {
  if (column === "imageUrl") return <Avatar name={String(row.fullName ?? row.leaderFullName ?? row.username ?? "")} src={value} />;
  if (column === "status" && typeof value === "boolean") return <StatusBadge active={value} />;
  if (column === "effect" && typeof value === "string") return <EffectBadge effect={value} />;
  if (column === "leaderLevel" && typeof value === "string") return <Badge>{levelLabels[value] ?? value}</Badge>;
  if (column === "passed" && typeof value === "boolean") return <Badge tone={value ? "success" : "danger"}>{value ? "Đạt" : "Chưa đạt"}</Badge>;
  if (column === "locked" && typeof value === "boolean") return <Badge tone={value ? "warning" : "neutral"}>{value ? "Đã khóa" : "Có thể sửa"}</Badge>;
  if (column.toLowerCase().includes("status") && typeof value === "string") return <WorkflowBadge value={value} />;
  if (typeof value === "string" || typeof value === "number") {
    const relatedValue = resolveRelatedDisplayValue(column, row);
    if (relatedValue !== undefined) return <span className="line-clamp-1 max-w-[260px]">{relatedValue}</span>;
  }
  if (typeof value === "boolean") return <Badge tone={value ? "success" : "neutral"}>{value ? "Có" : "Không"}</Badge>;
  if (value === null || value === undefined || value === "") return <span className="text-muted">Chưa có</span>;
  if (typeof value === "number") return viNumber.format(value);
  return <span className="line-clamp-1 max-w-[260px]">{String(value)}</span>;
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
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6c47ff,#8f7cff)] text-sm font-semibold text-white shadow-[0_10px_24px_rgb(108_71_255_/_0.24)]">
      {initial}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? "Đang hoạt động" : "Tạm ngưng"}</Badge>;
}

function EffectBadge({ effect }: { effect: string }) {
  return <Badge tone={effect === "DENY" ? "danger" : "success"}>{effect}</Badge>;
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

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "danger" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-[7px] border px-2.5 text-xs font-semibold",
        tone === "neutral" && "border-border bg-surface-1 text-muted",
        tone === "success" && "border-success/25 bg-success/10 text-success",
        tone === "danger" && "border-danger/25 bg-danger/10 text-danger",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-700",
      )}
    >
      {children}
    </span>
  );
}
