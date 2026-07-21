import { Crown, IdentificationCard } from "@phosphor-icons/react";
import { route, type RouteGroup } from "../route-config";

export const executiveBoardRouteGroup: RouteGroup = {
    moduleName: "executive-board",
    label: "Ban điều hành",
    icon: Crown,
    children: [
      route({
        path: "/executive-board/positions",
        moduleName: "executive-board.position",
        title: "Chức vụ",
        subtitle: "Thiết lập chức vụ theo cấp giáo phận, giáo hạt, giáo xứ.",
        endpoint: "/positions",
        idField: "positionCode",
        kind: "positions",
        icon: Crown,
        columns: ["positionCode", "positionName", "positionType", "status"],
        permissionPrefixes: ["organization.position.read."],
        actionPermissionPrefixes: ["organization.position.create.", "organization.position.update.", "organization.position.toggle."],
        primaryActionLabel: "Thêm chức vụ",
        filterLabels: ["Cấp áp dụng", "Trạng thái"],
      }),
      route({
        path: "/executive-board/assignments",
        moduleName: "executive-board.assignment",
        title: "Phân công ban điều hành",
        subtitle: "Theo dõi phân công chức vụ trong từng đơn vị.",
        endpoint: "/executive-board/assignments",
        idField: "id",
        kind: "executive-board",
        icon: IdentificationCard,
        columns: ["leaderFullName", "positionName", "unitType", "unitId", "startDate", "endDate", "status"],
        permissionPrefixes: ["organization.executive_board.read.", "organization.executive_board_assignment.read."],
        actionPermissionPrefixes: ["organization.executive_board.create.", "organization.executive_board.update.", "organization.executive_board_assignment.create.", "organization.executive_board_assignment.update.", "organization.executive_board_assignment.toggle."],
        primaryActionLabel: "Phân công",
        filterLabels: ["Loại đơn vị", "Đơn vị", "Chức vụ", "Trạng thái"],
        workflowHint: "endDate không được trước startDate; mỗi chức vụ active-current chỉ có một leader trong một unit.",
      }),
    ],
  };
