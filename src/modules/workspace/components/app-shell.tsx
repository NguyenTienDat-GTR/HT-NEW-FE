"use client";

import { CaretDown, CaretLeft, List, MagnifyingGlass } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ExcelJobsTray } from "@/components/common/resource/excel-jobs-tray";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { hasPermissionPrefix, isSuperAdmin } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { routeGroups, type RouteConfig, type RouteGroup } from "@/config/routes/routes";
import { NotificationPopover } from "@/modules/notifications/components/notification-popover";
import { HeaderScanButton } from "@/modules/qr-scan/components/header-scan-button";
import { AccountMenu } from "@/modules/account/components/account-menu";
import { PROFILE_PATH } from "@/modules/account/account-display";
import { useNotificationsSocket } from "@/modules/workspace/hooks/notifications-socket";

const defaultOpenGroups: Record<string, boolean> = {
  dashboard: true,
  organization: true,
  leader: true,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
      // Điều hướng cứng để bỏ Router Cache chứa dữ liệu của tài khoản vừa đăng xuất.
      window.location.assign("/login");
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
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-white shadow-[var(--shadow-sidebar)] transition-[width] duration-200 lg:flex lg:flex-col",
          sidebarCollapsed ? "w-[76px]" : "w-[260px]",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-border px-4", sidebarCollapsed && "justify-center px-0")}>
          <BrandMark compact={sidebarCollapsed} />
          {!sidebarCollapsed ? (
            <div className="ml-3 min-w-0">
              <p className="truncate text-sm font-bold text-foreground">HT Management</p>
              <p className="truncate text-xs text-muted">Quản lí huynh trưởng</p>
            </div>
          ) : null}
        </div>
        <button
          aria-label={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="absolute -right-3 top-5 z-10 grid h-6 w-6 cursor-pointer place-items-center rounded-full border border-border bg-white text-text-secondary shadow-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => setSidebarCollapsed((value) => !value)}
          title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          type="button"
        >
          <CaretLeft className={cn("h-3.5 w-3.5 transition-transform", sidebarCollapsed && "rotate-180")} weight="bold" />
        </button>
        {nav}
        {!sidebarCollapsed ? (
          <div className="border-t border-border p-4 text-xs leading-5 text-muted">
            <p className="font-medium text-foreground">© 2026 HT Management</p>
            <p>Thống nhất để phục vụ.</p>
          </div>
        ) : null}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[312px] bg-white shadow-[var(--shadow-elevated)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <BrandMark />
              <TooltipIconButton label="Đóng menu" onClick={() => setMobileOpen(false)}>
                <CaretLeft className="h-5 w-5" />
              </TooltipIconButton>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className={cn("transition-[padding] duration-200 lg:pl-[260px]", sidebarCollapsed && "lg:pl-[76px]")}>
        <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <TooltipIconButton className="lg:hidden" label="Mở menu" onClick={() => setMobileOpen(true)}>
                <List className="h-5 w-5" />
              </TooltipIconButton>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-foreground">{activeRoute?.title ?? (pathname === PROFILE_PATH ? "Hồ sơ cá nhân" : "HT Management")}</p>
                <p className="truncate text-xs text-muted">{activeGroup?.label ?? (pathname === PROFILE_PATH ? "Tài khoản" : "workspace")}</p>
              </div>
            </div>

            <label className="hidden h-10 w-full max-w-[460px] items-center gap-3 rounded-lg border border-border bg-surface-1 px-3 text-sm text-muted md:flex">
              <MagnifyingGlass className="h-5 w-5" />
              <span className="truncate">Tìm kiếm nhanh...</span>
            </label>

            <div className="flex shrink-0 items-center gap-2">
              <HeaderScanButton />
              <NotificationPopover />
              <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <AccountMenu loggingOut={isLoggingOut} onLogout={logout} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        <ExcelJobsTray />
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
        {groups.map((group) => {
          const GroupIcon = group.icon;
          const groupActive = group.children.some((route) => route.path === pathname);
          return (
            <Popover.Root key={group.moduleName}>
              <Popover.Trigger asChild>
                <button
                  aria-label={group.label}
                  className={cn(
                    "grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                    groupActive && "bg-primary-soft text-primary",
                  )}
                  title={group.label}
                  type="button"
                >
                  <GroupIcon size={21} weight={groupActive ? "fill" : "regular"} />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="start"
                  className="z-50 w-60 rounded-xl border border-border bg-white p-2 shadow-[var(--shadow-elevated)] focus:outline-none"
                  side="right"
                  sideOffset={12}
                >
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                  {group.children.map((route) => {
                    const active = pathname === route.path;
                    const Icon = route.icon;
                    return (
                      <Popover.Close asChild key={route.path}>
                        <Link
                          className={cn(
                            "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-primary",
                            active && "bg-primary-soft font-semibold text-primary",
                          )}
                          href={route.path as Route}
                          onClick={onNavigate}
                        >
                          <Icon size={18} weight={active ? "fill" : "regular"} />
                          <span className="truncate">{route.title}</span>
                        </Link>
                      </Popover.Close>
                    );
                  })}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => {
        const GroupIcon = group.icon;
        const groupActive = group.children.some((route) => route.path === pathname);
        const open = (openGroups[group.moduleName] ?? false) || groupActive;
        return (
          <div className="space-y-1" key={group.moduleName}>
            <button
              className={cn(
                "flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold uppercase tracking-wide text-muted transition-colors hover:bg-surface-hover hover:text-primary",
                groupActive && "text-foreground",
              )}
              onClick={() => toggleGroup(group.moduleName)}
              type="button"
            >
              <GroupIcon className="h-5 w-5 shrink-0" weight={groupActive ? "fill" : "regular"} />
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              <CaretDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
            </button>
            {open ? (
              <div className="space-y-0.5 pl-3">
                {group.children.map((route) => {
                  const active = pathname === route.path;
                  const Icon = route.icon;
                  return (
                    <Link
                      className={cn(
                        "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-primary",
                        active && "bg-primary-soft font-semibold text-primary before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary",
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

export function canSeeRoute(route: RouteConfig, user: AuthUser | null) {
  if (route.path === "/notifications") return true;
  if (user?.unitLocked) return false;
  if (isSuperAdmin(user) && isHiddenForSuperAdmin(route)) return false;
  return route.permissionPrefixes.length === 0 || route.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix));
}

export { notificationBadgeLabel } from "@/modules/notifications/notification-meta";

function isHiddenForSuperAdmin(route: RouteConfig) {
  return (
    route.moduleName.startsWith("leader.") ||
    route.moduleName.startsWith("executive-board.") ||
    route.moduleName.startsWith("training.") ||
    route.moduleName.startsWith("training-workflow.") ||
    route.moduleName.startsWith("certificate.")
  );
}
