import { Certificate, Gear } from "@phosphor-icons/react";
import { route, type RouteGroup } from "../route-config";

export const certificateRouteGroup: RouteGroup = {
    moduleName: "certificate",
    label: "Chứng nhận",
    icon: Certificate,
    children: [
      route({
        path: "/certificates",
        moduleName: "certificate.list",
        title: "Chứng nhận",
        subtitle: "Quản lý chứng nhận, duyệt ngoại lệ và khóa điểm sau approve.",
        endpoint: "/certificates",
        idField: "certificateCode",
        kind: "certificates",
        icon: Certificate,
        columns: ["certificateCode", "leaderFullName", "courseName", "totalScore", "passingScore", "approvalStatus", "status"],
        // Cột tính ra ở response không sắp xếp được; cột còn lại ánh xạ sang thuộc tính entity.
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", courseName: "course.courseName", totalScore: null, passingScore: "course.passingScore" },
        // Tìm theo thuộc tính entity (leaderFullName/courseName chỉ có ở response): mã chứng nhận, họ tên, tên thánh, khóa.
        searchFields: ["certificateCode", "leader.lastName+leader.firstName", "leader.holyName", "course.courseName", "course.courseCode"],
        permissionPrefixes: ["training.certificate.read."],
        actionPermissionPrefixes: ["training.certificate.create.", "training.certificate.approve.", "training.certificate.update.", "training.certificate.toggle."],
        primaryActionLabel: "Tạo chứng nhận",
        filterLabels: ["Khóa", "Kết quả", "Trạng thái duyệt"],
        workflowHint: "Nếu chưa đạt passingScore, approve bắt buộc nhập approvalReason.",
      }),
      route({
        path: "/certificates/config",
        moduleName: "certificate.config",
        title: "Cấu hình chứng nhận",
        subtitle: "Người ký, ảnh nền và bố cục mail merge theo loại khóa hoặc cấu hình chung.",
        endpoint: "/certificates/config",
        idField: "id",
        kind: "certificate-config",
        icon: Gear,
        columns: [],
        permissionPrefixes: ["training.certificate_config.read."],
        actionPermissionPrefixes: ["training.certificate_config.update."],
      }),
    ],
  };
