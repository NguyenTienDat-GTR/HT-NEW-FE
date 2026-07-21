import { UsersThree } from "@phosphor-icons/react";
import { route, type RouteGroup } from "../route-config";

export const leaderRouteGroup: RouteGroup = {
    moduleName: "leader",
    label: "Huynh trưởng",
    icon: UsersThree,
    children: [
      route({
        path: "/leaders",
        moduleName: "leader.list",
        title: "Huynh trưởng",
        subtitle: "Quản lý hồ sơ, ảnh đại diện và cấp hiện tại theo giáo xứ.",
        endpoint: "/leaders",
        idField: "id",
        kind: "leaders",
        icon: UsersThree,
        columns: ["imageUrl", "fullName", "holyName", "parishId", "leaderLevel", "email", "status"],
        permissionPrefixes: ["organization.leader.read."],
        actionPermissionPrefixes: ["organization.leader.create.", "organization.leader.update.", "organization.leader.toggle."],
        primaryActionLabel: "Thêm huynh trưởng",
        filterLabels: ["Giáo xứ", "Cấp HT", "Trạng thái"],
        workflowHint: "Leader update không gửi fullName, birthDate hoặc leaderLevel.",
      }),
      route({
        path: "/leaders/profiles",
        moduleName: "leader.profile",
        title: "Hồ sơ huynh trưởng",
        subtitle: "Tra cứu hồ sơ chi tiết, ảnh đại diện, tài khoản và lịch sử tham dự.",
        endpoint: "/leaders",
        idField: "id",
        kind: "leaders",
        icon: UsersThree,
        columns: ["imageUrl", "fullName", "holyName", "birthDate", "leaderLevel", "parishId", "status"],
        permissionPrefixes: ["organization.leader.read."],
        actionPermissionPrefixes: ["organization.leader.update."],
        primaryActionLabel: "Mở hồ sơ",
        filterLabels: ["Giáo xứ", "Cấp HT", "Trạng thái"],
      }),
    ],
  };
