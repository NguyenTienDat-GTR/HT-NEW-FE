"use client";

import { Bell, CaretDown, CaretLeft, List, MagnifyingGlass, SignOut } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { hasPermissionPrefix, isSuperAdmin } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useNotificationsSocket } from "./notifications-socket";
import { routeGroups, type RouteConfig, type RouteGroup } from "./routes";

const defaultOpenGroups: Record<string, boolean> = {
  dashboard: true,
  organization: true,
  leader: true,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpenGroups);
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

  const flatRoutes = visibleGroups.flatMap((group) => group.children);
  const activeRoute = flatRoutes.find((route) => route.path === pathname);
  const activeGroup = visibleGroups.find((group) => group.children.some((route) => route.path === pathname));

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiFetch<null>("/auth/logout", { method: "POST" });
    } catch {
      // Logout is best-effort on the client. The server revokes the current
      // session when valid tokens exist, while the client always clears memory.
    } finally {
      queryClient.clear();
      clear();
      router.replace("/login");
      setIsLoggingOut(false);
    }
  }

  const nav = (
    <SidebarNav
      groups={visibleGroups}
      openGroups={openGroups}
      pathname={pathname}
      sidebarCollapsed={sidebarCollapsed}
      toggleGroup={(groupName) => setOpenGroups((current) => ({ ...current, [groupName]: !current[groupName] }))}
      onNavigate={() => setMobileOpen(false)}
    />
  );

  return (
    <div className="min-h-[100dvh] bg-app-canvas text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-white shadow-[16px_0_40px_rgb(31_35_48_/_0.06)] transition-[width] duration-200 lg:flex lg:flex-col",
          sidebarCollapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-border px-4">
          <BrandMark compact={sidebarCollapsed} />
          <TooltipIconButton label={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"} onClick={() => setSidebarCollapsed((value) => !value)}>
            <CaretLeft className={cn("h-5 w-5 transition-transform", sidebarCollapsed && "rotate-180")} />
          </TooltipIconButton>
        </div>
        {nav}
        {!sidebarCollapsed ? (
          <div className="border-t border-border p-4 text-xs leading-5 text-muted">
            <p className="font-medium text-foreground">© 2026 HT Management</p>
            <p>Thống nhất để phục vụ.</p>
          </div>
        ) : null}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[#111827]/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[312px] bg-white shadow-[var(--shadow-elevated)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-[72px] items-center justify-between border-b border-border px-4">
              <BrandMark />
              <TooltipIconButton label="Đóng menu" onClick={() => setMobileOpen(false)}>
                <CaretLeft className="h-5 w-5" />
              </TooltipIconButton>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className={cn("transition-[padding] duration-200 lg:pl-[264px]", sidebarCollapsed && "lg:pl-[76px]")}>
        <header className="sticky top-0 z-30 border-b border-border bg-white/88 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <TooltipIconButton className="lg:hidden" label="Mở menu" onClick={() => setMobileOpen(true)}>
                <List className="h-5 w-5" />
              </TooltipIconButton>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-foreground">{activeRoute?.title ?? "HT Management"}</p>
                <p className="truncate text-xs text-muted">{activeGroup?.label ?? "workspace"}</p>
              </div>
            </div>

            <label className="hidden h-11 w-full max-w-[460px] items-center gap-3 rounded-[12px] border border-border bg-surface-1 px-3 text-sm text-muted shadow-inner md:flex">
              <MagnifyingGlass className="h-5 w-5" />
              <span className="truncate">Tìm kiếm nhanh...</span>
            </label>

            <div className="flex min-w-0 items-center gap-2">
              <Button asChild className="relative px-3" variant="ghost">
                <Link href="/notifications" aria-label="Thông báo">
                  <Bell size={20} />
                  <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">3</span>
                </Link>
              </Button>
              <div className="hidden min-w-0 items-center gap-3 rounded-[12px] border border-border bg-white px-3 py-2 shadow-sm sm:flex">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                  {(user?.username ?? "HT").slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{user?.username ?? "Đang tải"}</span>
                  <span className="block truncate text-xs text-muted">{user?.roles.join(", ") || "Chưa có vai trò"}</span>
                </span>
                <CaretDown className="h-4 w-4 text-muted" />
              </div>
              <TooltipIconButton label="Đăng xuất" loading={isLoggingOut} onClick={logout}>
                <SignOut className="h-5 w-5" />
              </TooltipIconButton>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1480px] px-4 py-5 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({
  groups,
  onNavigate,
  openGroups,
  pathname,
  sidebarCollapsed,
  toggleGroup,
}: {
  groups: RouteGroup[];
  onNavigate: () => void;
  openGroups: Record<string, boolean>;
  pathname: string;
  sidebarCollapsed: boolean;
  toggleGroup: (groupName: string) => void;
}) {
  if (sidebarCollapsed) {
    return (
      <nav className="flex flex-1 flex-col items-center gap-2 overflow-y-auto px-3 py-4">
        {groups.flatMap((group) =>
          group.children.map((route) => {
            const active = pathname === route.path;
            const Icon = route.icon;
            return (
              <Link
                aria-label={route.title}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-[10px] text-[#566078] transition-colors hover:bg-primary-soft hover:text-primary",
                  active && "bg-primary-soft text-primary shadow-[inset_0_0_0_1px_rgb(108_71_255_/_0.16)]",
                )}
                href={route.path as Route}
                key={route.path}
                onClick={onNavigate}
                title={route.title}
              >
                <Icon size={21} weight={active ? "fill" : "regular"} />
              </Link>
            );
          }),
        )}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4">
      {groups.map((group) => {
        const GroupIcon = group.icon;
        const groupActive = group.children.some((route) => route.path === pathname);
        const open = (openGroups[group.moduleName] ?? false) || groupActive;
        return (
          <div className="space-y-1" key={group.moduleName}>
            <button
              className={cn(
                "flex h-10 w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-[#283044] transition-colors hover:bg-primary-soft hover:text-primary",
                groupActive && "bg-primary-soft text-primary",
              )}
              onClick={() => toggleGroup(group.moduleName)}
              type="button"
            >
              <GroupIcon className="h-5 w-5 shrink-0" weight={groupActive ? "fill" : "regular"} />
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              <CaretDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
            </button>
            {open ? (
              <div className="space-y-1 pl-3">
                {group.children.map((route) => {
                  const active = pathname === route.path;
                  const Icon = route.icon;
                  return (
                    <Link
                      className={cn(
                        "flex h-9 items-center gap-3 rounded-[8px] px-3 text-sm font-medium text-[#566078] transition-colors hover:bg-primary-soft hover:text-primary",
                        active && "bg-primary-soft text-primary shadow-[inset_3px_0_0_#6c47ff]",
                      )}
                      href={route.path as Route}
                      key={route.path}
                      onClick={onNavigate}
                    >
                      <Icon size={18} weight={active ? "fill" : "regular"} />
                      <span className="truncate">{route.title}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function canSeeRoute(route: RouteConfig, user: AuthUser | null) {
  if (route.path === "/notifications") return true;
  if (isSuperAdmin(user) && isHiddenForSuperAdmin(route)) return false;
  return route.permissionPrefixes.length === 0 || route.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix));
}

function isHiddenForSuperAdmin(route: RouteConfig) {
  return (
    route.moduleName.startsWith("leader.") ||
    route.moduleName.startsWith("executive-board.") ||
    route.moduleName.startsWith("training.") ||
    route.moduleName.startsWith("training-workflow.") ||
    route.moduleName.startsWith("certificate.")
  );
}
