import type React from "react";
import { AppShell } from "@/modules/workspace/components/app-shell";
import { AuthGate } from "@/modules/workspace/components/auth-gate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
