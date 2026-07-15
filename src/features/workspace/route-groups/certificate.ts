import { Certificate } from "@phosphor-icons/react";
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
        permissionPrefixes: ["training.certificate.read."],
        actionPermissionPrefixes: ["training.certificate.create.", "training.certificate.approve.", "training.certificate.update.", "training.certificate.delete.", "training.certificate.toggle."],
        primaryActionLabel: "Tạo chứng nhận",
        filterLabels: ["Khóa", "Kết quả", "Trạng thái duyệt"],
        workflowHint: "Nếu chưa đạt passingScore, approve bắt buộc nhập approvalReason.",
      }),
      route({
        path: "/certificates/approvals",
        moduleName: "certificate.approval",
        title: "Duyệt chứng nhận",
        subtitle: "Hoàn tất chứng nhận và promotion sau khi hồ sơ đã chấm điểm.",
        endpoint: "/certificates",
        idField: "certificateCode",
        kind: "certificates",
        icon: Certificate,
        columns: ["leaderFullName", "courseName", "totalScore", "passingScore", "approvalReasonRequired", "approvalStatus"],
        permissionPrefixes: ["training.certificate.approve.", "training.certificate.read."],
        actionPermissionPrefixes: ["training.certificate.approve."],
        actions: {
          approve: { label: "Duyệt", permissionPrefixes: ["training.certificate.approve."] },
        },
        primaryActionLabel: "Duyệt chứng nhận",
        filterLabels: ["Khóa", "Trạng thái", "Ngoại lệ"],
        workflowHint: "Duyệt certificate có thể promote leader nhưng không được hạ cấp hiện tại.",
      }),
    ],
  };
