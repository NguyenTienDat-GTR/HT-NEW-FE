import { Buildings } from "@phosphor-icons/react";
import { route, type RouteGroup } from "../route-config";

export const organizationRouteGroup: RouteGroup = {
    moduleName: "organization",
    label: "Tổ chức",
    icon: Buildings,
    children: [
      route({
        path: "/organization/dioceses",
        moduleName: "organization.diocese",
        title: "Giáo phận",
        subtitle: "Quản lý thông tin giáo phận và liên đoàn.",
        endpoint: "/dioceses",
        idField: "id",
        kind: "dioceses",
        icon: Buildings,
        columns: ["name", "unionName", "deaneryCount", "parishCount", "leaderCount", "chaplain", "phoneNumber", "email", "status"],
        sortFields: { deaneryCount: null, parishCount: null, leaderCount: null },
        // Chỉ tìm theo thuộc tính entity (deaneryCount là số đếm tính ra, không tìm được).
        searchFields: ["name", "unionName"],
        permissionPrefixes: ["organization.diocese.read."],
        actionPermissionPrefixes: ["organization.diocese.create.", "organization.diocese.update.", "organization.diocese.toggle."],
        primaryActionPermissionPrefixes: ["organization.diocese.create."],
        primaryActionLabel: "Thêm giáo phận",
        filterLabels: ["Trạng thái", "Ngày thành lập"],
      }),
      route({
        path: "/organization/deaneries",
        moduleName: "organization.deanery",
        title: "Giáo hạt",
        subtitle: "Quản lý giáo hạt theo giáo phận được phân quyền.",
        endpoint: "/deaneries",
        idField: "id",
        kind: "deaneries",
        icon: Buildings,
        columns: ["name", "associationName", "parishCount", "leaderCount", "chaplain", "phoneNumber", "email", "status"],
        sortFields: { parishCount: null, leaderCount: null },
        // Chỉ tìm theo thuộc tính entity (parishCount là số đếm tính ra, không tìm được).
        searchFields: ["name", "associationName"],
        permissionPrefixes: ["organization.deanery.read."],
        actionPermissionPrefixes: ["organization.deanery.create.", "organization.deanery.update.", "organization.deanery.toggle."],
        primaryActionPermissionPrefixes: ["organization.deanery.create."],
        primaryActionLabel: "Thêm giáo hạt",
        filterLabels: ["Trạng thái"],
        filters: [
          {
            key: "status",
            label: "Trạng thái",
            type: "select",
            options: [
              { value: "all", label: "Tất cả" },
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Tạm ngưng" },
            ],
          },
        ],
      }),
      route({
        path: "/organization/parishes",
        moduleName: "organization.parish",
        title: "Giáo xứ, giáo họ, giáo điểm",
        subtitle: "Quản lý giáo xứ, giáo họ và giáo điểm (đơn vị cơ sở) theo giáo hạt.",
        endpoint: "/parishes",
        idField: "id",
        kind: "parishes",
        icon: Buildings,
        columns: ["name", "unitTypeLabel", "parentParishName", "chapterName", "leaderCount", "deaneryId", "status"],
        sortFields: { leaderCount: null, deaneryId: "deanery.name", unitTypeLabel: "unitType", parentParishName: "parentParish.name" },
        // Chỉ tìm theo thuộc tính entity (leaderCount là số đếm tính ra, không tìm được).
        searchFields: ["name", "chapterName"],
        permissionPrefixes: ["organization.parish.read."],
        actionPermissionPrefixes: ["organization.parish.create.", "organization.parish.update.", "organization.parish.toggle."],
        primaryActionPermissionPrefixes: ["organization.parish.create."],
        primaryActionLabel: "Thêm giáo xứ / họ / điểm",
        filterLabels: ["Giáo hạt", "Loại đơn vị", "Trạng thái"],
      }),
    ],
  };
