"use client";

import { CaretDown, EnvelopeSimple, IdentificationCard, Key, SignOut } from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";
import { useMyProfile } from "../account-api";
import { displayName, primaryRoleName, roleLabel } from "../account-display";
import { ChangePasswordDialog } from "./change-password-dialog";
import { UserAvatar } from "./user-avatar";

/** Khối tên + avatar trên thanh đầu trang; bấm để mở menu tài khoản. */
export function AccountMenu({ onLogout, loggingOut }: { onLogout: () => void; loggingOut: boolean }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profileQuery = useMyProfile();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const profile = profileQuery.data;
  const name = displayName(profile, user?.username);
  const imageUrl = profile?.leader?.imageUrl;
  const primaryRole = primaryRoleName(profile?.roles, user?.roles);
  const roleChips = profile?.roles.length
    ? profile.roles
    : (user?.roles ?? []).map((code, index) => ({ code, name: roleLabel(code), primary: index === 0 }));

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            aria-label={`Tài khoản ${name}`}
            className="group flex h-11 min-w-11 max-w-[240px] shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-transparent p-1 text-left transition-colors duration-200 hover:border-border hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:border-border data-[state=open]:bg-surface-hover sm:pr-2.5"
            type="button"
          >
            <UserAvatar imageUrl={imageUrl} name={name} showStatus />
            <span className="hidden min-w-[96px] flex-1 sm:block">
              <span className="block truncate text-sm font-semibold leading-5 text-foreground">{name}</span>
              <span className="block truncate text-xs leading-4 text-text-secondary">{primaryRole}</span>
            </span>
            <CaretDown
              aria-hidden
              className="hidden h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block"
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 w-[min(300px,calc(100vw-32px))] origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-xl border border-border bg-white p-1.5 shadow-[var(--shadow-elevated)] focus:outline-none motion-safe:data-[state=open]:animate-[account-menu-in_160ms_ease-out]"
            sideOffset={8}
          >
            <div className="flex items-center gap-3 rounded-lg bg-surface-2/70 p-3">
              <UserAvatar imageUrl={imageUrl} name={name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className="truncate text-xs text-text-secondary">@{user?.username}</p>
              </div>
            </div>
            <div className="space-y-1.5 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Vai trò</p>
              <div className="flex flex-wrap gap-1.5">
                {roleChips.length ? (
                  roleChips.map((role) => <RoleChip key={role.code} name={role.name} primary={role.primary} />)
                ) : (
                  <span className="text-xs text-muted">Chưa có vai trò</span>
                )}
              </div>
              {profile?.email ? (
                <p className="flex items-center gap-1.5 pt-1 text-xs text-text-secondary">
                  <EnvelopeSimple aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </p>
              ) : null}
            </div>

            <DropdownMenu.Separator className="my-1 h-px bg-border" />

            <MenuItem
              description="Thông tin Huynh Trưởng của bạn"
              icon={IdentificationCard}
              label="Xem hồ sơ cá nhân"
              onSelect={() => router.push("/profile")}
            />
            <MenuItem
              description="Xác thực bằng mã OTP qua email"
              icon={Key}
              label="Đổi mật khẩu"
              onSelect={() => setPasswordOpen(true)}
            />

            <DropdownMenu.Separator className="my-1 h-px bg-border" />

            <MenuItem
              disabled={loggingOut}
              icon={SignOut}
              label={loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
              onSelect={onLogout}
              tone="danger"
            />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ChangePasswordDialog onOpenChange={setPasswordOpen} open={passwordOpen} />
    </>
  );
}

export function RoleChip({ name, primary }: { name: string; primary: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        primary ? "bg-primary text-white" : "bg-primary-soft text-primary",
      )}
      title={primary ? "Vai trò chính" : "Vai trò phụ"}
    >
      {name}
      {primary ? <span className="sr-only">(vai trò chính)</span> : null}
    </span>
  );
}

function MenuItem({
  description,
  disabled,
  icon: Icon,
  label,
  onSelect,
  tone = "default",
}: {
  description?: string;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" | "duotone" }>;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-150 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
        tone === "danger"
          ? "text-danger data-[highlighted]:bg-[var(--badge-danger-bg)]"
          : "text-foreground data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary",
      )}
      disabled={disabled}
      onSelect={onSelect}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          tone === "danger" ? "bg-[var(--badge-danger-bg)]" : "bg-surface-2",
        )}
      >
        <Icon aria-hidden className="h-[18px] w-[18px]" weight="regular" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium leading-5">{label}</span>
        {description ? <span className="block truncate text-xs leading-4 text-muted">{description}</span> : null}
      </span>
    </DropdownMenu.Item>
  );
}
