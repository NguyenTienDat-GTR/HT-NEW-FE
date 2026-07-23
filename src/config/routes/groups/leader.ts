import { UsersThree } from "@phosphor-icons/react";
import { route, type RouteGroup } from "../route-config";

export const leaderRouteGroup: RouteGroup = {
    moduleName: "leader",
    label: "Hồ sơ huynh trưởng",
    icon: UsersThree,
    children: [
      route({
        path: "/leaders/profiles",
        moduleName: "leader.profile",
        title: "Hồ sơ huynh trưởng",
        subtitle: "Tra cứu hồ sơ chi tiết, ảnh đại diện, tài khoản và lịch sử tham dự.",
        endpoint: "/leaders",
        idField: "id",
        kind: "leaders",
        icon: UsersThree,
        columns: ["imageUrl", "holyName", "fullName", "deaneryName", "parishId", "birthDate", "leaderLevel", "status"],
        permissionPrefixes: ["organization.leader.read."],
        actionPermissionPrefixes: ["organization.leader.create.", "organization.leader.update.", "organization.leader.toggle."],
        primaryActionLabel: "Thêm huynh trưởng",
        createPath: "/leaders/new",
        filterLabels: ["Giáo hạt", "Giáo xứ", "Cấp HT", "Trạng thái"],
        workflowHint: "Khi chỉnh sửa, hệ thống không gửi lại họ tên, ngày sinh hoặc cấp huynh trưởng.",
      }),
    ],
  };
