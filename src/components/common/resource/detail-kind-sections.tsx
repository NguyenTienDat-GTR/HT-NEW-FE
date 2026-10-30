import { AUDIT_SECTION, hasNumber, hasText, type DetailSection } from "./detail-section-types";
import { SYSTEM_DETAIL_SECTIONS } from "./system-detail-sections";
import type { ResourceKind } from "@/config/routes/routes";
import { ResourceCell } from "./resource-format";

const POSITION_SECTIONS: DetailSection[] = [
  {
    title: "Thông tin chức vụ",
    fields: [
      { key: "positionName", label: "Tên chức vụ", wide: true },
      { key: "positionType", label: "Cấp áp dụng" },
      { key: "displayOrder", label: "Thứ tự hiển thị" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  AUDIT_SECTION,
];

const ASSIGNMENT_SECTIONS: DetailSection[] = [
  {
    title: "Thông tin phân công",
    fields: [
      {
        key: "leaderName",
        label: "Huynh trưởng",
        wide: true,
        value: (row) => [row.leaderHolyName, row.leaderFullName].filter((part) => typeof part === "string" && part.trim()).join(" "),
      },
      { key: "leaderParishName", label: "Giáo xứ / giáo họ / giáo điểm" },
      { key: "leaderDeaneryName", label: "Giáo hạt" },
      { key: "positionName", label: "Chức vụ" },
      { key: "unitType", label: "Cấp áp dụng" },
      { key: "unitName", label: "Đơn vị" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  {
    title: "Thời gian hiệu lực",
    fields: [
      { key: "startDate", label: "Ngày bắt đầu" },
      { key: "endDate", label: "Ngày kết thúc" },
    ],
  },
  AUDIT_SECTION,
];

// Loại khóa huấn luyện: gom theo ý nghĩa, ẩn mã định danh (UUID), khóa tiên quyết hiển thị bằng tên.
const COURSE_TYPE_SECTIONS: DetailSection[] = [
  {
    title: "Thông tin loại khóa",
    fields: [
      { key: "typeName", label: "Tên loại khóa", wide: true },
      { key: "managementUnitType", label: "Cấp quản lý" },
      { key: "certificateShortCode", label: "Mã viết tắt chứng chỉ", visible: (row) => hasText(row.certificateShortCode) },
      { key: "status", label: "Trạng thái" },
    ],
  },
  {
    title: "Điều kiện tham dự",
    fields: [
      { key: "requiredCurrentLevel", label: "Cấp hiện tại yêu cầu", render: (row) => (hasText(row.requiredCurrentLevel) ? <ResourceCell column="requiredCurrentLevel" displayMode="detail" row={row} value={row.requiredCurrentLevel} /> : "Không yêu cầu") },
      { key: "requiredMinAge", label: "Tuổi tối thiểu", render: (row) => (hasNumber(row.requiredMinAge) ? `${row.requiredMinAge} tuổi` : "Không yêu cầu") },
      { key: "requiredYearsActive", label: "Số năm sinh hoạt", render: (row) => (hasNumber(row.requiredYearsActive) ? `${row.requiredYearsActive} năm` : "Không yêu cầu") },
    ],
  },
  {
    title: "Khóa tiên quyết và nâng cấp",
    fields: [
      { key: "prerequisiteTypeName", label: "Khóa tiên quyết", render: (row) => (hasText(row.prerequisiteTypeName) ? String(row.prerequisiteTypeName) : "Không có") },
      {
        key: "maxYearsAfterPrerequisite",
        label: "Thời hạn tối đa sau khóa tiên quyết",
        visible: (row) => hasText(row.prerequisiteTypeName),
        render: (row) => (hasNumber(row.maxYearsAfterPrerequisite) ? `${row.maxYearsAfterPrerequisite} năm` : "Không giới hạn"),
      },
      {
        key: "resultingLevel",
        label: "Cấp độ khi hoàn thành",
        render: (row) =>
          hasText(row.resultingLevel) && row.resultingLevel !== "NONE" ? (
            <ResourceCell column="resultingLevel" displayMode="detail" row={row} value={row.resultingLevel} />
          ) : (
            "Không có (không yêu cầu chứng nhận)"
          ),
      },
    ],
  },
  AUDIT_SECTION,
];

// Hồ sơ tham dự (4 tab của khóa: đăng ký, duyệt đăng ký, danh sách tham dự, chấm điểm): gom theo ý nghĩa, ẩn mã định danh.
const PARTICIPATION_SECTIONS: DetailSection[] = [
  {
    title: "Huynh trưởng",
    fields: [
      { key: "leaderFullName", label: "Họ và tên", wide: true },
      { key: "leaderLevel", label: "Cấp huynh trưởng" },
      { key: "parishName", label: "Giáo xứ / giáo họ / giáo điểm" },
      { key: "deaneryName", label: "Giáo hạt" },
    ],
  },
  {
    title: "Đăng ký tham dự",
    fields: [
      { key: "courseName", label: "Khóa huấn luyện", wide: true, visible: (_row, embedded) => !embedded },
      { key: "registrationDate", label: "Ngày đăng ký" },
      { key: "participationStatus", label: "Trạng thái tham dự" },
      { key: "eligible", label: "Đủ điều kiện", render: (row) => (row.eligible === false ? "Chưa đủ điều kiện (hồ sơ ngoại lệ)" : "Đủ điều kiện") },
      { key: "parishSubmittedAt", label: "Giáo xứ gửi lúc", visible: (row) => hasText(row.parishSubmittedAt) },
      { key: "exceptionReason", label: "Lý do ngoại lệ", wide: true, visible: (row) => hasText(row.exceptionReason) },
      { key: "offTargetReason", label: "Lý do gửi ngoài đợt", wide: true, visible: (row) => hasText(row.offTargetReason) },
      { key: "crossDeaneryReason", label: "Lý do gửi liên giáo hạt", wide: true, visible: (row) => hasText(row.crossDeaneryReason) },
      { key: "homeDeaneryName", label: "Giáo hạt gửi sang", visible: (row) => hasText(row.crossDeaneryReason) },
      { key: "homeDeaneryApprovedBy", label: "Giáo hạt nhà đồng ý bởi", visible: (row) => hasText(row.homeDeaneryApprovedBy) },
      { key: "registrationNote", label: "Ghi chú đăng ký", wide: true, visible: (row) => hasText(row.registrationNote) },
    ],
  },
  {
    title: "Phê duyệt đăng ký",
    fields: [
      { key: "approvalStatus", label: "Trạng thái duyệt" },
      {
        key: "approvedBy",
        label: "Người duyệt",
        // Mã định danh (UUID) không hiển thị; chỉ hiện khi hệ thống tự duyệt.
        render: (row) => (row.approvedBy === "SYSTEM_AUTO_APPROVAL" ? "Hệ thống tự duyệt" : <span className="text-muted">—</span>),
        visible: (row) => row.approvedBy === "SYSTEM_AUTO_APPROVAL",
      },
      { key: "approvedByName", label: "Người duyệt", visible: (row) => hasText(row.approvedByName) && row.approvedBy !== "SYSTEM_AUTO_APPROVAL" },
      { key: "review", label: "Ghi chú duyệt", wide: true, visible: (row) => hasText(row.review) },
    ],
  },
  {
    title: "Kết quả khóa huấn luyện",
    visible: (row) => row.totalScore !== null && row.totalScore !== undefined || Array.isArray(row.componentScores) && row.componentScores.length > 0 || hasText(row.scoreNote),
    fields: [
      { key: "componentScores", label: "Điểm thành phần", wide: true, render: (row) => <ComponentScoreList scores={row.componentScores} />, visible: (row) => Array.isArray(row.componentScores) && row.componentScores.length > 0 },
      { key: "totalScore", label: "Tổng điểm" },
      { key: "passingScore", label: "Điểm đạt" },
      { key: "passed", label: "Đánh giá điểm" },
      { key: "finalResult", label: "Kết quả chung", visible: (row) => hasText(row.finalResult) },
      { key: "courseResultingLevel", label: "Cấp độ khi đạt", visible: (row) => hasText(row.courseResultingLevel) && row.courseResultingLevel !== "NONE" },
      { key: "targetLevel", label: "Cấp độ đạt được (ngoại lệ)", visible: (row) => hasText(row.targetLevel) },
      { key: "scoreNote", label: "Nhận xét", wide: true },
    ],
  },
  {
    title: "Chứng nhận",
    visible: (row) => hasText(row.certificateApprovalStatus) && row.certificateApprovalStatus !== "NOT_REQUIRED",
    fields: [
      { key: "certificateApprovalStatus", label: "Trạng thái chứng nhận" },
      { key: "certificateRequestedAt", label: "Ngày yêu cầu", visible: (row) => hasText(row.certificateRequestedAt) },
      { key: "certificateApprovedAt", label: "Ngày duyệt", visible: (row) => hasText(row.certificateApprovedAt) },
    ],
  },
  AUDIT_SECTION,
];

export function ComponentScoreList({ scores }: { scores: unknown }) {
  const items = Array.isArray(scores) ? (scores as { componentName?: string; score?: number | string | null; maxScore?: number | string | null }[]) : [];
  if (items.length === 0) return <span className="text-muted">Chưa chấm điểm</span>;
  return (
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={`${item.componentName}-${index}`}>
          {item.componentName ?? "Thành phần"}: <span className="font-semibold">{item.score ?? "—"}</span>
          {item.maxScore !== null && item.maxScore !== undefined ? ` / ${item.maxScore}` : ""}
        </li>
      ))}
    </ul>
  );
}

// Nội dung ngăn chi tiết theo loại tài nguyên; loại không có ở đây dùng bảng khóa-giá trị chung.
export const DETAIL_SECTIONS_BY_KIND: Partial<Record<ResourceKind, DetailSection[]>> = {
  positions: POSITION_SECTIONS,
  participations: PARTICIPATION_SECTIONS,
  "course-types": COURSE_TYPE_SECTIONS,
  "executive-board": ASSIGNMENT_SECTIONS,
  ...SYSTEM_DETAIL_SECTIONS,
};
