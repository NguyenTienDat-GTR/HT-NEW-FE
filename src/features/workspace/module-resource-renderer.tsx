"use client";

import { CertificateResourceView } from "@/features/certificate/certificate-resource-view";
import { ExecutiveBoardResourceView } from "@/features/executive-board/executive-board-resource-view";
import { LeaderResourceView } from "@/features/leader/leader-resource-view";
import { OrganizationResourceView } from "@/features/organization/organization-resource-view";
import { SystemResourceView } from "@/features/system/system-resource-view";
import { TrainingResourceView } from "@/features/training/training-resource-view";
import { TrainingWorkflowResourceView } from "@/features/training-workflow/training-workflow-resource-view";
import type { RouteConfig } from "./routes";

export function ModuleResourceRenderer({ route }: { route: RouteConfig }) {
  if (route.moduleName.startsWith("leader.")) return <LeaderResourceView route={route} />;
  if (route.moduleName.startsWith("organization.")) return <OrganizationResourceView route={route} />;
  if (route.moduleName.startsWith("executive-board.")) return <ExecutiveBoardResourceView route={route} />;
  if (route.moduleName.startsWith("training-workflow.") || route.moduleName.startsWith("training.registration") || route.moduleName.startsWith("training.approval") || route.moduleName.startsWith("training.participation") || route.moduleName.startsWith("training.score")) {
    return <TrainingWorkflowResourceView route={route} />;
  }
  if (route.moduleName.startsWith("training.")) return <TrainingResourceView route={route} />;
  if (route.moduleName.startsWith("certificate.")) return <CertificateResourceView route={route} />;
  return <SystemResourceView route={route} />;
}
