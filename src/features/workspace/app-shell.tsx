"use client";

import { Bell, CaretLeft, List, MagnifyingGlass, SignOut } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useNotificationsSocket } from "./notifications-socket";
import { routeGroups, type RouteConfig } from "./routes";

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

  const visibleGroups = useMemo(
    () =>
      routeGroups
        .map((group) => ({
          ...group,
          children: group.children.filter((route) => canSeeRoute(route, user)),
        }))
        .filter((group) => group.children.length > 0),
    [user],
  );

  const activeRoute = visibleGroups.flatMap((group) => group.children).find((route) => route.path === pathname);

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
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {visibleGroups.map((group) => {
        const GroupIcon = group.icon;
        return (
          <div className="space-y-1" key={group.moduleName}>
            {!collapsed ? (
              <div className="flex h-8 items-center gap-2 px-3 text-[11px] font-semibold uppercase text-muted">
                <GroupIcon className="h-4 w-4" />
                <span className="truncate">{group.label}</span>
              </div>
            ) : null}
            {group.children.map((route) => {
              const active = pathname === route.path;
              const Icon = route.icon;
              const content = (
                <Link
                  className={cn(
                    "group flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-1 hover:text-foreground",
                    active && "bg-primary text-white shadow-[0_10px_22px_rgb(108_71_255_/_0.18)] hover:bg-primary hover:text-white",
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
                <div key={route.path} title={`${group.label}: ${route.title}`}>
                  {content}
                </div>
              ) : (
                <div key={route.path}>{content}</div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-surface-1 text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-white transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-3">
          {!collapsed ? (
            <div>
              <span className="text-sm font-semibold">HT Management</span>
              <p className="text-xs text-muted">Quản lý Huynh trưởng</p>
            </div>
          ) : null}
          <TooltipIconButton label={collapsed ? "Mở rộng menu" : "Thu gọn menu"} onClick={() => setCollapsed((value) => !value)}>
            <CaretLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          </TooltipIconButton>
        </div>
        {nav}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[300px] bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div>
                <span className="text-sm font-semibold">HT Management</span>
                <p className="text-xs text-muted">Menu module</p>
              </div>
              <TooltipIconButton label="Đóng menu" onClick={() => setMobileOpen(false)}>
                <CaretLeft className="h-5 w-5" />
              </TooltipIconButton>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}
      <div className={cn("transition-[padding] duration-200 lg:pl-[260px]", collapsed && "lg:pl-[72px]")}>
        <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <TooltipIconButton className="lg:hidden" label="Mở menu" onClick={() => setMobileOpen(true)}>
                <List className="h-5 w-5" />
              </TooltipIconButton>
              <div className="hidden h-10 w-[320px] items-center gap-2 rounded-[10px] border border-border bg-surface-1 px-3 text-sm text-muted md:flex">
                <MagnifyingGlass className="h-4 w-4" />
                <span className="truncate">Tìm nhanh hồ sơ, khóa học, tài khoản...</span>
              </div>
              <div className="min-w-0 md:hidden">
                <p className="truncate text-sm font-semibold">{activeRoute?.title ?? "HT Management"}</p>
                <p className="truncate text-xs text-muted">{activeRoute?.moduleName ?? "workspace"}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Button asChild variant="ghost">
                <Link href="/notifications">
                  <Bell size={18} />
                  Thông báo
                </Link>
              </Button>
              <div className="hidden min-w-0 border-l border-border pl-3 sm:block">
                <p className="truncate text-sm font-semibold">{user?.username ?? "Đang tải"}</p>
                <p className="truncate text-xs text-muted">{user?.roles.join(", ") || "Chưa có vai trò"}</p>
              </div>
              <TooltipIconButton label="Đăng xuất" loading={isLoggingOut} onClick={logout}>
                <SignOut className="h-5 w-5" />
              </TooltipIconButton>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
      </div>
    </div>
  );
}

function canSeeRoute(route: RouteConfig, user: AuthUser | null) {
  if (route.path === "/notifications") return true;
  return route.permissionPrefixes.length === 0 || route.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix));
}
