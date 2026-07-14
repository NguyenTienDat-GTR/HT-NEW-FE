"use client";

import { DashboardView } from "@/features/analytics/dashboard-view";
import { AnalyticsView } from "@/features/analytics/analytics-view";
import type React from "react";
import { AuthGate } from "./auth-gate";
import { AppShell } from "./app-shell";
import { ModuleResourceRenderer } from "./module-resource-renderer";
import { findRoute } from "./routes";

export function WorkspacePage({ segments }: { segments: string[] }) {
  const path = `/${segments.join("/")}`;
  const route = findRoute(path);
  if (!route) {
    return (
      <AuthGate>
        <AppShell>
          <div className="rounded-xl border border-border bg-white p-6 shadow-(--shadow-card)">Không tìm thấy màn hình</div>
        </AppShell>
      </AuthGate>
    );
  }

  let content: React.ReactNode;
  if (route.kind === "dashboard") content = <DashboardView />;
  else if (route.kind === "analytics") content = <AnalyticsView />;
  else content = <ModuleResourceRenderer route={route} />;

  return (
    <AuthGate>
      <AppShell>{content}</AppShell>
    </AuthGate>
  );
}
