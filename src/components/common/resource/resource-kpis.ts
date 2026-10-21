import type { RouteConfig } from "@/config/routes/routes";
import { getLeaderLevels } from "@/modules/leader-levels/leader-level-store";
import type { PageResponse } from "@/lib/api/client";

export type ResourceKpiTone = "primary" | "success" | "warning" | "accent" | "danger";

export type ResourceKpi = {
  label: string;
  value: number;
  tone: ResourceKpiTone;
};

export type ResourceKpiQuerySpec = {
  id: string;
  queryString: string;
};

const SYSTEM_KPI_KINDS = new Set(["accounts", "roles", "permissions"]);
const SYSTEM_HIDDEN_KINDS = new Set(["account-roles", "role-permissions", "account-permissions", "audit-logs", "notifications"]);

// Thẻ KPI theo từng cấp độ trong danh mục (đúng thứ tự cấp), màu theo nhóm cấp.
function leaderLevelKpis(): Array<{ value: string; label: string; tone: ResourceKpiTone }> {
  return getLeaderLevels().map((level) => ({
    value: level.levelCode,
    label: level.levelName,
    tone: level.levelCode === "NONE" ? "accent" : level.levelCode === "HT_XU" ? "success" : level.levelCode === "DU_TRUONG" ? "warning" : level.levelCode.startsWith("HLV_") ? "danger" : "primary",
  }));
}

const unitTypeKpis = [
  { value: "DIOCESE", label: "Cấp giáo phận", tone: "primary" },
  { value: "DEANERY", label: "Cấp giáo hạt", tone: "accent" },
  { value: "PARISH", label: "Cấp giáo xứ", tone: "success" },
] satisfies Array<{ value: string; label: string; tone: ResourceKpiTone }>;

export function shouldShowResourceKpis(route: RouteConfig) {
  if (route.moduleName.startsWith("system.")) return SYSTEM_KPI_KINDS.has(route.kind);
  return !SYSTEM_HIDDEN_KINDS.has(route.kind) && Boolean(route.endpoint);
}

export function buildResourceKpiQuerySpecs(route: RouteConfig, queryString: string): ResourceKpiQuerySpec[] {
  if (!shouldShowResourceKpis(route)) return [];

  const specs: ResourceKpiQuerySpec[] = [];
  addSpec(specs, "status:active", constrainStatusQueryString(queryString, true));
  addSpec(specs, "status:inactive", constrainStatusQueryString(queryString, false));

  if (route.kind === "leaders") {
    leaderLevelKpis().forEach((level) => addSpec(specs, kpiId("leaderLevel", level.value), constrainFilterQueryString(queryString, "leaderLevel", level.value)));
  }

  if (route.kind === "positions") {
    unitTypeKpis.forEach((unitType) => addSpec(specs, kpiId("positionType", unitType.value), constrainFilterQueryString(queryString, "positionType", unitType.value)));
  }

  return specs;
}

export function buildResourceKpis({
  route,
  pageData,
  queryTotals,
}: {
  route: RouteConfig;
  pageData?: PageResponse<Record<string, unknown>>;
  queryTotals: Record<string, number>;
}): ResourceKpi[] {
  if (!shouldShowResourceKpis(route)) return [];

  const noun = kpiNoun(route);
  const kpis: ResourceKpi[] = [
    { label: `Tổng ${noun}`, value: pageData?.totalElements ?? 0, tone: "primary" },
    { label: "Đang hoạt động", value: queryTotals["status:active"] ?? 0, tone: "success" },
    { label: "Tạm ngưng", value: queryTotals["status:inactive"] ?? 0, tone: "warning" },
  ];

  if (route.kind === "leaders") {
    kpis.push(...leaderLevelKpis().map((level) => ({ label: level.label, value: queryTotals[kpiId("leaderLevel", level.value)] ?? 0, tone: level.tone })));
  }

  if (route.kind === "positions") {
    kpis.push(...unitTypeKpis.map((unitType) => ({ label: unitType.label, value: queryTotals[kpiId("positionType", unitType.value)] ?? 0, tone: unitType.tone })));
  }

  return kpis;
}

function constrainStatusQueryString(queryString: string, status: boolean) {
  const params = normalizedParams(queryString);
  const current = params.get("status");
  if (current && current !== String(status)) return undefined;
  params.set("status", String(status));
  return params.toString();
}

function constrainFilterQueryString(queryString: string, key: string, value: string) {
  const params = normalizedParams(queryString);
  const filters = parseFilters(params.get("filters"));
  const current = filters[key];
  if (current !== undefined && String(current) !== value) return undefined;
  filters[key] = value;
  params.set("filters", JSON.stringify(filters));
  return params.toString();
}

function normalizedParams(queryString: string) {
  const params = new URLSearchParams(queryString);
  params.set("page", "0");
  params.set("size", "1");
  return params;
}

function parseFilters(value: string | null) {
  if (!value) return {} as Record<string, string | number | boolean>;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, string | number | boolean>) : {};
  } catch {
    return {};
  }
}

function addSpec(specs: ResourceKpiQuerySpec[], id: string, queryString: string | undefined) {
  if (queryString && !specs.some((spec) => spec.id === id)) {
    specs.push({ id, queryString });
  }
}

function kpiId(field: string, value: string) {
  return `${field}:${value}`;
}

function kpiNoun(route: RouteConfig) {
  switch (route.kind) {
    case "dioceses":
      return "giáo phận";
    case "deaneries":
      return "giáo hạt";
    case "parishes":
      return "giáo xứ";
    case "leaders":
      return "huynh trưởng";
    case "positions":
      return "chức vụ";
    case "courses":
      return "khóa";
    case "accounts":
      return "tài khoản";
    case "roles":
      return "vai trò";
    case "permissions":
      return "quyền hạn";
    default:
      return "bản ghi";
  }
}
