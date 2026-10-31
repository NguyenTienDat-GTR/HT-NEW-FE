"use client";

import { CertificateResourceView } from "@/modules/certificates/components/certificate-resource-view";
import { ExecutiveBoardResourceView } from "@/modules/executive-board/components/executive-board-resource-view";
import { LeaderResourceView } from "@/modules/leaders/components/leader-resource-view";
import { OrganizationResourceView } from "@/modules/organizations/components/organization-resource-view";
import { SystemResourceView } from "@/modules/workspace/components/system-resource-view";
import { TrainingResourceView } from "@/modules/training-courses/components/training-resource-view";
import { TrainingWorkflowResourceView } from "@/modules/training-workflow/components/training-workflow-resource-view";
import type { RouteConfig } from "@/config/routes/routes";
import { resolveResourceModule } from "@/modules/workspace/view-resolution";

export function ModuleResourceRenderer({ route }: { route: RouteConfig }) {
  switch (resolveResourceModule(route.moduleName)) {
    case "leader":
      return <LeaderResourceView route={route} />;
    case "organization":
      return <OrganizationResourceView route={route} />;
    case "executive-board":
      return <ExecutiveBoardResourceView route={route} />;
    case "training-workflow":
      return <TrainingWorkflowResourceView route={route} />;
    case "training":
      return <TrainingResourceView route={route} />;
    case "certificate":
      return <CertificateResourceView route={route} />;
    case "system":
      return <SystemResourceView route={route} />;
  }
}
