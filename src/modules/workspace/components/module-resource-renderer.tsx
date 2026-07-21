"use client";

import { CertificateResourceView } from "@/modules/certificates/components/certificate-resource-view";
import { ExecutiveBoardResourceView } from "@/modules/executive-board/components/executive-board-resource-view";
import { LeaderResourceView } from "@/modules/leaders/components/leader-resource-view";
import { OrganizationResourceView } from "@/modules/organizations/components/organization-resource-view";
import { SystemResourceView } from "@/modules/workspace/components/system-resource-view";
import { TrainingResourceView } from "@/modules/training-courses/components/training-resource-view";
import { TrainingWorkflowResourceView } from "@/modules/training-workflow/components/training-workflow-resource-view";
import type { RouteConfig } from "@/config/routes/routes";

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
