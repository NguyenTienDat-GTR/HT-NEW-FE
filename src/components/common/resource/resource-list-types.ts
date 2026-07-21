import type { RouteConfig } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";

export type ResourceListModuleConfig = {
  moduleLabel: string;
  moduleDescription: string;
  canCreate?: (route: RouteConfig, user: AuthUser | null) => boolean;
  buildApprovePath?: (route: RouteConfig, rows: Record<string, unknown>[], id: string) => string;
  buildApproveBody?: (route: RouteConfig, note?: string) => unknown;
};

export type ResourceListRuntimeProps = {
  route: RouteConfig;
  config: ResourceListModuleConfig;
};
