"use client";

import { Bell, CaretLeft, List, SignOut } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasAnyPermission, hasPermissionPrefix } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useNotificationsSocket } from "./notifications-socket";
import { routes } from "./routes";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  useNotificationsSocket();

  const visibleRoutes = useMemo(
    () =>
      routes.filter((route) => {
        if (route.path === "/notifications") return true;
        return route.permissionPrefixes.length === 0 || route.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix));
      }),
    [user],
  );

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiFetch<null>("/auth/logout", { method: "POST" });
    } catch {
      // Logout is best-effort on the client. The backend clears/revokes the current
      // session when tokens are present, while the client must always drop memory auth.
    } finally {
      queryClient.clear();
      clear();
      router.replace("/login");
      setIsLoggingOut(false);
    }
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {visibleRoutes.map((route) => {
        const active = pathname === route.path;
        const Icon = route.icon;
        const content = (
          <Link
            className={cn(
              "flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-1 hover:text-foreground",
              active && "bg-primary text-white hover:bg-primary hover:text-white",
              collapsed && "justify-center px-0",
            )}
            href={route.path as Route}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={20} weight={active ? "fill" : "regular"} />
            {!collapsed ? <span className="truncate">{route.title}</span> : null}
          </Link>
        );
        return collapsed ? (
          <div key={route.path} title={route.title}>
            {content}
          </div>
        ) : (
          <div key={route.path}>{content}</div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-surface-1 text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-white transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[72px]" : "w-[240px]",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-3">
          {!collapsed ? <span className="text-sm font-semibold">HT Management</span> : null}
          <TooltipIconButton label={collapsed ? "Mở rộng menu" : "Thu gọn menu"} onClick={() => setCollapsed((value) => !value)}>
            <CaretLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          </TooltipIconButton>
        </div>
        {nav}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[280px] bg-white" onClick={(event) => event.stopPropagation()}>
            {nav}
          </aside>
        </div>
      ) : null}
      <div className={cn("transition-[padding] duration-200 lg:pl-[240px]", collapsed && "lg:pl-[72px]")}>
        <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <TooltipIconButton className="lg:hidden" label="Mở menu" onClick={() => setMobileOpen(true)}>
                <List className="h-5 w-5" />
              </TooltipIconButton>
              <div>
                <p className="text-sm font-semibold">{user?.username ?? "Đang tải"}</p>
                <p className="text-xs text-muted">{user?.roles.join(", ") || "Chưa có vai trò"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasAnyPermission(user, []) ? (
                <Button asChild variant="ghost">
                  <Link href="/notifications">
                    <Bell size={18} />
                    Thông báo
                  </Link>
                </Button>
              ) : null}
              <TooltipIconButton label="Đăng xuất" loading={isLoggingOut} onClick={logout}>
                <SignOut className="h-5 w-5" />
              </TooltipIconButton>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1100px] px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
