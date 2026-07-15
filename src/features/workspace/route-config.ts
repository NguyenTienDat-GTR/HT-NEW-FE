import type { Icon } from "@phosphor-icons/react";

export type ResourceKind =
  | "dashboard"
  | "analytics"
  | "notifications"
  | "dioceses"
  | "deaneries"
  | "parishes"
  | "positions"
  | "executive-board"
  | "leaders"
  | "courses"
  | "requirements"
  | "score-components"
  | "score-formulas"
  | "participations"
  | "certificates"
  | "accounts"
  | "roles"
  | "permissions"
  | "account-roles"
  | "role-permissions"
  | "account-permissions"
  | "audit-logs";

export type ResourceAction = "view" | "create" | "edit" | "toggle" | "delete" | "submit" | "approve" | "score" | "matrix" | "read";

export type ResourceActionConfig = {
  label: string;
  permissionPrefixes?: string[];
  requiredRoles?: string[];
  href?: string;
  route?: string;
  invalidates?: string[];
};

export type RouteConfig = {
  path: string;
  createPath?: string;
  editPath?: string;
  idField?: string;
  moduleName: string;
  title: string;
  subtitle: string;
  endpoint?: string;
  permissionPrefixes: string[];
  actionPermissionPrefixes?: string[];
  primaryActionPermissionPrefixes?: string[];
  kind: ResourceKind;
  icon: Icon;
  columns: string[];
  searchFields?: string[];
  primaryActionLabel?: string;
  filterLabels?: string[];
  workflowHint?: string;
  actions?: Partial<Record<ResourceAction, ResourceActionConfig>>;
};

export type RouteGroup = {
  moduleName: string;
  label: string;
  icon: Icon;
  permissionPrefixes?: string[];
  children: RouteConfig[];
};

export function route(config: RouteConfig): RouteConfig {
  const createPermissionPrefixes =
    config.primaryActionPermissionPrefixes ??
    config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".create.") || prefix.includes(".manage.") || prefix.includes(".submit."));
  const updatePermissionPrefixes =
    config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".update.") || prefix.includes(".manage.") || prefix.includes(".assign."));
  const togglePermissionPrefixes = config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".toggle.") || prefix.includes(".update.") || prefix.includes(".manage."));
  const deletePermissionPrefixes =
    config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".delete.") || prefix.includes(".manage.") || prefix.includes(".revoke."));
  const approvePermissionPrefixes = config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".approve."));
  const submitPermissionPrefixes = config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".submit."));
  const scorePermissionPrefixes = config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".score."));

  return {
    ...config,
    createPath: config.createPath ?? (config.primaryActionLabel ? `${config.path}/new` : undefined),
    editPath: config.editPath ?? `${config.path}/:id/edit`,
    idField: config.idField ?? "id",
    actions: {
      view: { label: "Xem chi tiết", permissionPrefixes: config.permissionPrefixes },
      ...(config.primaryActionLabel && createPermissionPrefixes?.length
        ? { create: { label: config.primaryActionLabel, permissionPrefixes: createPermissionPrefixes } }
        : {}),
      ...(updatePermissionPrefixes?.length ? { edit: { label: "Sửa", permissionPrefixes: updatePermissionPrefixes } } : {}),
      ...(togglePermissionPrefixes?.length ? { toggle: { label: "Đổi trạng thái", permissionPrefixes: togglePermissionPrefixes } } : {}),
      ...(deletePermissionPrefixes?.length ? { delete: { label: "Xóa", permissionPrefixes: deletePermissionPrefixes } } : {}),
      ...(approvePermissionPrefixes?.length ? { approve: { label: "Duyệt", permissionPrefixes: approvePermissionPrefixes } } : {}),
      ...(submitPermissionPrefixes?.length ? { submit: { label: "Gửi", permissionPrefixes: submitPermissionPrefixes } } : {}),
      ...(scorePermissionPrefixes?.length ? { score: { label: "Chấm điểm", permissionPrefixes: scorePermissionPrefixes } } : {}),
      ...config.actions,
    },
    searchFields: config.searchFields ?? config.columns.filter((column) => !column.toLowerCase().includes("status")).slice(0, 3),
  };
}
