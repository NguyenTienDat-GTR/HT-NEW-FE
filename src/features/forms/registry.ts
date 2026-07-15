import type { RouteConfig } from "@/features/workspace/routes";
import { certificateFormSpecs, trainingFormSpecs } from "./specs/training";
import { organizationFormSpecs } from "./specs/organization";
import { personnelFormSpecs } from "./specs/personnel";
import { systemFormSpecs } from "./specs/system";
import { workflowFormSpecs } from "./specs/workflow";
import type { ResourceFormSpec } from "./types";
import type { AuthUser } from "@/lib/auth/auth-store";
import { isSuperAdmin } from "@/lib/auth/permissions";

const specs = [...organizationFormSpecs, ...personnelFormSpecs, ...trainingFormSpecs, ...certificateFormSpecs, ...systemFormSpecs, ...workflowFormSpecs];

export function getFormSpec(route: RouteConfig, actionType: "create" | "edit" | "score" | "matrix" = "create", user?: AuthUser | null): ResourceFormSpec | undefined {
  const matchingSpecs = specs.filter((spec) => isVisibleForUser(spec, user));
  const orderedSpecs = isSuperAdmin(user)
    ? [...matchingSpecs.filter((spec) => spec.superAdminOnly), ...matchingSpecs.filter((spec) => !spec.superAdminOnly)]
    : matchingSpecs;
  return (
    orderedSpecs.find((spec) => spec.moduleName === route.moduleName && spec.actionType === actionType) ??
    orderedSpecs.find((spec) => spec.kind === route.kind && spec.actionType === actionType) ??
    orderedSpecs.find((spec) => spec.kind === route.kind && !spec.actionType)
  );
}

function isVisibleForUser(spec: ResourceFormSpec, user: AuthUser | null | undefined) {
  if (spec.superAdminOnly) return isSuperAdmin(user);
  return true;
}
