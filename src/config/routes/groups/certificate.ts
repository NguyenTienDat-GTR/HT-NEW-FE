import { Certificate, Gear } from "@phosphor-icons/react";
import { deaneryUnitFilter, parishUnitFilter, route, type RouteFilterConfig, type RouteGroup } from "../route-config";

// Năm cấp: 10 năm gần nhất tính từ năm hiện tại (chứng nhận cấp theo ngày duyệt nên không có năm tương lai).
const issueYearOptions = Array.from({ length: 10 }, (_, index) => {
  const year = String(new Date().getFullYear() - index);
  return { value: year, label: year };
});

// Bộ lọc màn hình chứng nhận: khóa, loại khóa có cấp chứng nhận, trạng thái, giáo hạt, giáo xứ và năm cấp.
// "issueDate:year" lọc theo năm của ngày cấp ở BE (khoảng 01/01 - 31/12).
const certificateFilters: RouteFilterConfig[] = [
  { key: "course.courseCode", label: "Khóa huấn luyện", type: "select", optionsEndpoint: "/training/courses", optionValue: "courseCode", optionLabel: "courseName" },
  {
    key: "course.courseType.typeCode",
    label: "Loại khóa có chứng nhận",
    type: "select",
    optionsEndpoint: "/certificates/config/course-types",
    optionValue: "typeCode",
    optionLabel: "typeName",
  },
  {
    key: "approvalStatus",
    label: "Trạng thái",
    type: "select",
    options: [
      { value: "PENDING", label: "Chờ duyệt" },
      { value: "APPROVED", label: "Đã duyệt" },
      { value: "REJECTED", label: "Từ chối" },
      { value: "REVOKED", label: "Đã thu hồi" },
    ],
  },
  deaneryUnitFilter("leader.parish.deanery.id"),
  parishUnitFilter("leader.parish.id", "leader.parish.deanery.id"),
  { key: "issueDate:year", label: "Năm cấp", type: "select", options: issueYearOptions },
];

export const certificateRouteGroup: RouteGroup = {
    moduleName: "certificate",
    label: "Chứng nhận",
    icon: Certificate,
    children: [
      route({
        path: "/certificates",
        moduleName: "certificate.list",
        title: "Chứng nhận",
        subtitle: "Xem, xuất PDF, thu hồi và cấp lại chứng nhận. Chứng nhận được sinh tự động khi hồ sơ hoàn thành khóa huấn luyện.",
        endpoint: "/certificates",
        idField: "certificateCode",
        kind: "certificates",
        icon: Certificate,
        columns: ["certificateCode", "leaderFullName", "courseName", "totalScore", "passingScore", "approvalStatus"],
        // Cột tính ra ở response không sắp xếp được; cột còn lại ánh xạ sang thuộc tính entity.
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", courseName: "course.courseName", totalScore: null, passingScore: "course.passingScore" },
        // Tìm theo thuộc tính entity (leaderFullName/courseName chỉ có ở response): mã chứng nhận, tên huynh trưởng
        // (họ tên, tên họ, tên thánh kèm họ tên), khóa.
        searchFields: [
          "certificateCode",
          "leader.lastName+leader.firstName",
          "leader.firstName+leader.lastName",
          "leader.holyName+leader.lastName+leader.firstName",
          "leader.holyName",
          "course.courseName",
          "course.courseCode",
        ],
        permissionPrefixes: ["training.certificate.read."],
        actionPermissionPrefixes: ["training.certificate.approve.", "training.certificate.revoke.", "training.certificate.reissue."],
        filters: certificateFilters,
        filterLabels: ["Khóa huấn luyện", "Loại khóa", "Trạng thái", "Giáo hạt", "Giáo xứ", "Năm cấp"],
        workflowHint: "Thu hồi chứng nhận đã duyệt sẽ chuyển hồ sơ của khóa liên kết thành không đạt.",
      }),
      route({
        path: "/certificates/config",
        moduleName: "certificate.config",
        title: "Cấu hình chứng nhận",
        subtitle: "Thư viện cấu hình: ảnh nền và bố cục mail merge, dùng chung hoặc gán riêng cho từng loại khóa.",
        endpoint: "/certificates/config",
        idField: "id",
        kind: "certificate-config",
        icon: Gear,
        columns: [],
        permissionPrefixes: ["training.certificate_config.read."],
        actionPermissionPrefixes: ["training.certificate_config.create.", "training.certificate_config.update.", "training.certificate_config.delete."],
      }),
    ],
  };
