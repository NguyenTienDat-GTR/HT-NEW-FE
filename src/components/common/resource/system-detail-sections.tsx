import { auditOperationLabel, auditStatusText } from "./audit-log-labels";
import { formatPermissionTaxonomyValue } from "./permission-taxonomy-labels";
import { ResourceCell } from "./resource-format";
import { AUDIT_SECTION, hasText, type DetailField, type DetailSection } from "./detail-section-types";

// Drawer chi tiết nhóm hệ thống / phân quyền / huấn luyện: gom theo ý nghĩa, tiếng Việt, ẩn mọi mã định danh (UUID, mã nội bộ).
const AUTH_PROVIDER_LABELS: Record<string, string> = { LOCAL: "Tài khoản hệ thống", GOOGLE: "Google" };
const REVOCATION_REASON_LABELS: Record<string, string> = { EXPIRED: "Hết hạn hiệu lực", MANUAL: "Thu hồi thủ công" };
const UNIT_TYPE_LABELS: Record<string, string> = { DIOCESE: "Giáo phận", DEANERY: "Giáo hạt", PARISH: "Giáo xứ" };
const SYSTEM_ACTORS: Record<string, string> = { SYSTEM: "Hệ thống", "super-admin": "Quản trị viên", SYSTEM_AUTO_APPROVAL: "Hệ thống tự duyệt" };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

const yesNo = (value: unknown) => (value === true ? "Có" : "Không");
const mapped = (labels: Record<string, string>, value: unknown) => (typeof value === "string" ? (labels[value] ?? value) : "");
// Người thực hiện: ưu tiên tên đã được BE giải mã; mã nội bộ (UUID) tuyệt đối không hiển thị.
const actorName = (name: unknown, raw: unknown) => {
  if (hasText(name)) return String(name);
  if (typeof raw === "string" && SYSTEM_ACTORS[raw]) return SYSTEM_ACTORS[raw];
  return typeof raw === "string" && !UUID_PATTERN.test(raw) ? raw : "";
};
const expiresField: DetailField = {
  key: "expiresAt",
  label: "Hết hạn",
  render: (row: Row) => (hasText(row.expiresAt) ? <ResourceCell column="expiresAt" displayMode="detail" row={row} value={row.expiresAt} /> : "Không giới hạn"),
};

const revocationFields: DetailField[] = [
  { key: "revokedAt", label: "Ngày thu hồi", visible: (row) => hasText(row.revokedAt) },
  { key: "revokedByName", label: "Người thu hồi", visible: (row) => hasText(row.revokedAt), value: (row) => actorName(row.revokedByName, row.revokedBy) },
  { key: "revocationReason", label: "Lý do thu hồi", visible: (row) => hasText(row.revocationReason), value: (row) => mapped(REVOCATION_REASON_LABELS, row.revocationReason) },
];

const accountSections: DetailSection[] = [
  {
    title: "Thông tin tài khoản",
    fields: [
      { key: "username", label: "Tên đăng nhập" },
      { key: "leaderFullName", label: "Huynh trưởng", visible: (row) => hasText(row.leaderFullName) },
      { key: "authProvider", label: "Nguồn đăng nhập", value: (row) => mapped(AUTH_PROVIDER_LABELS, row.authProvider) },
      { key: "status", label: "Trạng thái" },
    ],
  },
  {
    title: "Vai trò",
    fields: [
      { key: "primaryRoleName", label: "Vai trò chính" },
      { key: "secondaryRoleNames", label: "Vai trò phụ", wide: true, visible: (row) => Array.isArray(row.secondaryRoleNames) && row.secondaryRoleNames.length > 0 },
    ],
  },
  {
    title: "Đơn vị quản lý",
    visible: (row) => hasText(row.dioceseName) || hasText(row.deaneryName) || hasText(row.parishName),
    fields: [
      { key: "dioceseName", label: "Giáo phận", visible: (row) => hasText(row.dioceseName) },
      { key: "deaneryName", label: "Giáo hạt", visible: (row) => hasText(row.deaneryName) },
      { key: "parishName", label: "Giáo xứ", visible: (row) => hasText(row.parishName) },
    ],
  },
  AUDIT_SECTION,
];

const roleSections: DetailSection[] = [
  {
    title: "Thông tin vai trò",
    fields: [
      { key: "roleName", label: "Tên vai trò", wide: true },
      { key: "description", label: "Mô tả", wide: true, visible: (row) => hasText(row.description) },
      { key: "isSystem", label: "Vai trò hệ thống", value: (row) => yesNo(row.isSystem) },
      { key: "displayOrder", label: "Thứ tự hiển thị" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  AUDIT_SECTION,
];

const permissionSections: DetailSection[] = [
  {
    title: "Thông tin quyền",
    fields: [
      { key: "permissionName", label: "Tên quyền", wide: true },
      { key: "description", label: "Mô tả", wide: true, visible: (row) => hasText(row.description) },
      { key: "isSystem", label: "Quyền hệ thống", value: (row) => yesNo(row.isSystem) },
      { key: "displayOrder", label: "Thứ tự hiển thị" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  {
    title: "Phạm vi áp dụng",
    fields: [
      { key: "moduleCode", label: "Phân hệ" },
      { key: "resourceCode", label: "Đối tượng" },
      { key: "actionCode", label: "Thao tác" },
      { key: "scopeCode", label: "Phạm vi" },
    ],
  },
  AUDIT_SECTION,
];

const accountRoleSections: DetailSection[] = [
  {
    title: "Vai trò của tài khoản",
    fields: [
      { key: "username", label: "Tài khoản" },
      { key: "leaderFullName", label: "Huynh trưởng", visible: (row) => hasText(row.leaderFullName) },
      { key: "roleName", label: "Vai trò" },
      { key: "isPrimary", label: "Loại vai trò", value: (row) => (row.isPrimary === true ? "Vai trò chính" : "Vai trò phụ") },
      { key: "status", label: "Trạng thái" },
    ],
  },
  {
    title: "Gán vai trò",
    fields: [
      { key: "assignedByName", label: "Người gán", value: (row) => actorName(row.assignedByName, row.assignedBy) },
      { key: "assignedAt", label: "Ngày gán" },
      expiresField,
    ],
  },
  AUDIT_SECTION,
];

const rolePermissionSections: DetailSection[] = [
  {
    title: "Quyền của vai trò",
    fields: [
      { key: "roleName", label: "Vai trò" },
      { key: "permissionName", label: "Quyền", wide: true },
      { key: "validity", label: "Tình trạng quyền" },
      { key: "conditions", label: "Điều kiện áp dụng", wide: true, visible: (row) => hasText(row.conditions) },
    ],
  },
  {
    title: "Thời hạn và thu hồi",
    fields: [
      { key: "assignedByName", label: "Người gán", value: (row) => actorName(row.assignedByName, row.assignedBy) },
      { key: "assignedAt", label: "Ngày gán" },
      expiresField,
      ...revocationFields,
    ],
  },
  AUDIT_SECTION,
];

const accountPermissionSections: DetailSection[] = [
  {
    title: "Quyền của tài khoản",
    fields: [
      { key: "username", label: "Tài khoản" },
      { key: "permissionName", label: "Quyền", wide: true },
      { key: "validity", label: "Tình trạng quyền" },
      { key: "reason", label: "Lý do cấp", wide: true, visible: (row) => hasText(row.reason) },
    ],
  },
  {
    title: "Thời hạn và thu hồi",
    fields: [expiresField, ...revocationFields],
  },
  AUDIT_SECTION,
];

const scoreComponentSections: DetailSection[] = [
  {
    title: "Thông tin thành phần điểm",
    fields: [
      { key: "name", label: "Tên thành phần", wide: true },
      { key: "description", label: "Mô tả", wide: true, visible: (row) => hasText(row.description) },
      { key: "courseTypeName", label: "Loại khóa", visible: (row) => hasText(row.courseTypeName) },
      { key: "unitType", label: "Cấp áp dụng", value: (row) => mapped(UNIT_TYPE_LABELS, row.unitType) },
      { key: "displayOrder", label: "Thứ tự hiển thị" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  {
    title: "Cách tính điểm",
    fields: [
      { key: "maxScore", label: "Điểm tối đa" },
      { key: "coefficient", label: "Hệ số" },
      { key: "includeInFinal", label: "Tính vào điểm tổng kết", value: (row) => yesNo(row.includeInFinal) },
    ],
  },
  AUDIT_SECTION,
];

const auditLogSections: DetailSection[] = [
  {
    title: "Thông tin thao tác",
    fields: [
      { key: "loggedAt", label: "Thời gian" },
      { key: "username", label: "Tài khoản thực hiện" },
      { key: "operation", label: "Thao tác", value: (row) => (hasText(row.operation) ? auditOperationLabel(String(row.operation)) : String(row.action ?? "")) },
      { key: "module", label: "Phân hệ", visible: (row) => hasText(row.module) },
      { key: "resource", label: "Loại đối tượng", value: (row) => formatPermissionTaxonomyValue("resource", String(row.resource ?? "")) ?? String(row.resource ?? ""), visible: (row) => hasText(row.resource) },
      { key: "resourceName", label: "Tên đối tượng", visible: (row) => hasText(row.resourceName) },
      { key: "resourceId", label: "Mã đối tượng", visible: (row) => hasText(row.resourceId) },
      { key: "unitType", label: "Cấp đơn vị", value: (row) => mapped(UNIT_TYPE_LABELS, row.unitType), visible: (row) => hasText(row.unitType) },
      { key: "message", label: "Nội dung", wide: true, visible: (row) => hasText(row.message) },
      { key: "errorMessage", label: "Thông báo lỗi", wide: true, visible: (row) => hasText(row.errorMessage) },
    ],
  },
  {
    title: "Yêu cầu kỹ thuật",
    fields: [
      { key: "httpMethod", label: "Phương thức" },
      { key: "requestPath", label: "Đường dẫn", wide: true },
      { key: "statusCode", label: "Mã phản hồi HTTP", value: (row) => (typeof row.statusCode === "number" ? `${row.statusCode} · ${auditStatusText(row.statusCode)}` : "") },
      { key: "durationMs", label: "Thời gian xử lý", value: (row) => (typeof row.durationMs === "number" ? `${row.durationMs} ms` : ""), visible: (row) => typeof row.durationMs === "number" },
      { key: "queryString", label: "Bộ lọc yêu cầu", wide: true, visible: (row) => hasText(row.queryString) },
      { key: "ipAddress", label: "Địa chỉ IP" },
      { key: "userAgent", label: "Thiết bị / trình duyệt", wide: true, visible: (row) => hasText(row.userAgent) },
    ],
  },
];

export const SYSTEM_DETAIL_SECTIONS: Record<string, DetailSection[]> = {
  accounts: accountSections,
  roles: roleSections,
  permissions: permissionSections,
  "account-roles": accountRoleSections,
  "role-permissions": rolePermissionSections,
  "account-permissions": accountPermissionSections,
  "score-components": scoreComponentSections,
  "audit-logs": auditLogSections,
};
