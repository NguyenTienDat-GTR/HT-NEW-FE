import { dashboardRouteGroup } from "./groups/dashboard";
import { organizationRouteGroup } from "./groups/organization";
import { leaderRouteGroup } from "./groups/leader";
import { executiveBoardRouteGroup } from "./groups/executive-board";
import { trainingRouteGroup } from "./groups/training";
import { trainingWorkflowRouteGroup } from "./groups/training-workflow";
import { certificateRouteGroup } from "./groups/certificate";
import { systemRouteGroup } from "./groups/system";
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

export type RouteMatch =
  | { type: "list"; route: RouteConfig; params: Record<string, string> }
  | { type: "create"; route: RouteConfig; params: Record<string, string> }
  | { type: "edit"; route: RouteConfig; params: Record<string, string> }
  | { type: "score"; route: RouteConfig; params: Record<string, string> }
  | { type: "matrix"; route: RouteConfig; params: Record<string, string> };

export function matchRoute(path: string): RouteMatch | undefined {
  const exact = findRoute(path);
  if (exact) return { type: "list", route: exact, params: {} };

  for (const routeConfig of routes) {
    if (routeConfig.createPath === path) return { type: "create", route: routeConfig, params: {} };
    const editMatch = matchTemplate(routeConfig.editPath, path);
    if (editMatch) return { type: "edit", route: routeConfig, params: editMatch };

    const scoreMatch = routeConfig.actions?.score?.route ? matchTemplate(routeConfig.actions.score.route, path) : undefined;
    if (scoreMatch) return { type: "score", route: routeConfig, params: scoreMatch };

    const matrixMatch = routeConfig.actions?.matrix?.route ? matchTemplate(routeConfig.actions.matrix.route, path) : undefined;
    if (matrixMatch) return { type: "matrix", route: routeConfig, params: matrixMatch };
  }

  return undefined;
}

function matchTemplate(template: string | undefined, path: string) {
  if (!template) return undefined;
  const templateParts = template.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (templateParts.length !== pathParts.length) return undefined;
  const params: Record<string, string> = {};
  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index];
    const pathPart = pathParts[index];
    if (templatePart?.startsWith(":")) {
      params[templatePart.slice(1)] = decodeURIComponent(pathPart ?? "");
    } else if (templatePart !== pathPart) {
      return undefined;
    }
  }
  return params;
}
