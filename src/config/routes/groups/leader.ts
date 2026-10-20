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
        // fullName/deaneryName/parishId chỉ là cột hiển thị: ánh xạ sang thuộc tính entity (họ tên Việt sắp theo tên rồi họ).
        sortFields: { imageUrl: null, fullName: "firstName+lastName", deaneryName: "parish.deanery.name", parishId: "parish.name" },
        // fullName/deaneryName chỉ có ở response, không phải thuộc tính entity nên không tìm trực tiếp được: tìm theo họ tên ghép, tên thánh, email, số điện thoại, giáo xứ, giáo hạt.
        searchFields: ["lastName+firstName", "holyName", "email", "phoneNumber", "parish.name", "parish.deanery.name"],
        permissionPrefixes: ["organization.leader.read."],
        actionPermissionPrefixes: ["organization.leader.create.", "organization.leader.update.", "organization.leader.toggle."],
        primaryActionLabel: "Thêm huynh trưởng",
        createPath: "/leaders/new",
        detailPath: "/leaders/profiles/:id",
        actions: {
          edit: { label: "Sửa", permissionPrefixes: ["organization.leader.update."], requiredRoles: ["ADMIN_PARISH", "ROLE_ADMIN_PARISH"] },
        },
        filterLabels: ["Giáo hạt", "Giáo xứ", "Cấp HT", "Trạng thái"],
        workflowHint: "Khi chỉnh sửa, hệ thống không gửi lại họ tên, ngày sinh hoặc cấp huynh trưởng.",
      }),
    ],
  };
