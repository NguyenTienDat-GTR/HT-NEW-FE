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
        subtitle: "Xem, xuất PDF và thu hồi chứng nhận. Chứng nhận được sinh tự động khi hồ sơ hoàn thành khóa huấn luyện.",
        endpoint: "/certificates",
        idField: "certificateCode",
        kind: "certificates",
        icon: Certificate,
        columns: ["certificateCode", "leaderFullName", "courseName", "totalScore", "passingScore", "approvalStatus"],
        // Cột tính ra ở response không sắp xếp được; cột còn lại ánh xạ sang thuộc tính entity.
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", courseName: "course.courseName", totalScore: null, passingScore: "course.passingScore" },
        // Tìm theo thuộc tính entity (leaderFullName/courseName chỉ có ở response): mã chứng nhận, họ tên, tên thánh, khóa.
        searchFields: ["certificateCode", "leader.lastName+leader.firstName", "leader.holyName", "course.courseName", "course.courseCode"],
        permissionPrefixes: ["training.certificate.read."],
        actionPermissionPrefixes: ["training.certificate.approve.", "training.certificate.revoke."],
        filterLabels: ["Khóa", "Kết quả", "Trạng thái duyệt"],
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
