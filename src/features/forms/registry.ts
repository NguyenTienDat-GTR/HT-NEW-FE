import type { RouteConfig } from "@/features/workspace/routes";
import { certificateFormSpecs, trainingFormSpecs } from "./specs/training";
import { organizationFormSpecs } from "./specs/organization";
import { personnelFormSpecs } from "./specs/personnel";
import { systemFormSpecs } from "./specs/system";
import { workflowFormSpecs } from "./specs/workflow";
import type { ResourceFormSpec } from "./types";

const specs = [...organizationFormSpecs, ...personnelFormSpecs, ...trainingFormSpecs, ...certificateFormSpecs, ...systemFormSpecs, ...workflowFormSpecs];

export function getFormSpec(route: RouteConfig, actionType: "create" | "edit" | "score" | "matrix" = "create"): ResourceFormSpec | undefined {
  return (
    specs.find((spec) => spec.moduleName === route.moduleName && spec.actionType === actionType) ??
    specs.find((spec) => spec.kind === route.kind && spec.actionType === actionType) ??
    specs.find((spec) => spec.kind === route.kind && !spec.actionType)
  );
}
