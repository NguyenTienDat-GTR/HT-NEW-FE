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

export type RouteConfig = {
  path: string;
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
};

export type RouteGroup = {
  moduleName: string;
  label: string;
  icon: Icon;
  permissionPrefixes?: string[];
  children: RouteConfig[];
};

export function route(config: RouteConfig): RouteConfig {
  return {
    ...config,
    searchFields: config.searchFields ?? config.columns.filter((column) => !column.toLowerCase().includes("status")).slice(0, 3),
  };
}
