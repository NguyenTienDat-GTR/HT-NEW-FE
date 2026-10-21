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
        // Tạo/sửa chức vụ mở bằng modal trên trang danh sách (?create=1, ?edit=<mã>), không có trang riêng.
        createPath: "/executive-board/positions?create=1",
        editPath: "/executive-board/positions?edit=:id",
        idField: "positionCode",
        kind: "positions",
        icon: Crown,
        columns: ["positionName", "positionType", "status"],
        searchFields: ["positionName"],
        filters: [],
        permissionPrefixes: ["organization.position.read."],
        actionPermissionPrefixes: ["organization.position.create.", "organization.position.update.", "organization.position.toggle."],
        primaryActionLabel: "Thêm chức vụ",
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
        columns: ["leaderFullName", "positionName", "startDate", "endDate", "status"],
        filters: [],
        // Phân công/sửa mở bằng modal trên trang danh sách (?create=1, ?edit=<id>), không có trang riêng.
        createPath: "/executive-board/assignments?create=1",
        editPath: "/executive-board/assignments?edit=:id",
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", positionName: "position.positionName" },
        // Tìm theo thuộc tính entity (leaderFullName/positionName chỉ có ở response): họ tên, tên thánh, chức vụ.
        searchFields: ["leader.lastName+leader.firstName", "leader.holyName", "position.positionName"],
        permissionPrefixes: ["organization.executive_board.read.", "organization.executive_board_assignment.read."],
        actionPermissionPrefixes: ["organization.executive_board.create.", "organization.executive_board.update.", "organization.executive_board_assignment.create.", "organization.executive_board_assignment.update.", "organization.executive_board_assignment.toggle."],
        primaryActionLabel: "Phân công",
        workflowHint: "endDate không được trước startDate; mỗi chức vụ active-current chỉ có một leader trong một unit.",
      }),
    ],
  };
