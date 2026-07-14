import { dashboardRouteGroup } from "./route-groups/dashboard";
import { organizationRouteGroup } from "./route-groups/organization";
import { leaderRouteGroup } from "./route-groups/leader";
import { executiveBoardRouteGroup } from "./route-groups/executive-board";
import { trainingRouteGroup } from "./route-groups/training";
import { trainingWorkflowRouteGroup } from "./route-groups/training-workflow";
import { certificateRouteGroup } from "./route-groups/certificate";
import { systemRouteGroup } from "./route-groups/system";
import type { RouteConfig, RouteGroup } from "./route-config";

export type { ResourceKind, RouteConfig, RouteGroup } from "./route-config";

export const routeGroups: RouteGroup[] = [
  dashboardRouteGroup,
  organizationRouteGroup,
  leaderRouteGroup,
  executiveBoardRouteGroup,
  trainingRouteGroup,
  trainingWorkflowRouteGroup,
  certificateRouteGroup,
  systemRouteGroup,
];

export const routes: RouteConfig[] = routeGroups.flatMap((group) => group.children);

export function findRoute(path: string) {
  return routes.find((routeConfig) => routeConfig.path === path);
}
