"use client";

import {
  Cake,
  Church,
  EnvelopeSimple,
  GenderIntersex,
  IdentificationBadge,
  Key,
  MapPin,
  Phone,
  ShieldCheck,
  UserCircle,
  UserList,
  WarningCircle,
} from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { formatLeaderLevel } from "@/components/common/resource/resource-format";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { displayValue, formatDate, genderLabel } from "@/modules/leaders/components/leader-detail-utils";
import { type MyLeaderProfile, type MyProfile, useMyProfile } from "../account-api";
import { displayName } from "../account-display";
import { RoleChip } from "./account-menu";
import { CertificatesSection, RankHistorySection, SectionTitle } from "./my-profile-sections";
import { ChangeEmailDialog } from "./change-email-dialog";
import { ChangePasswordDialog } from "./change-password-dialog";
import { UserAvatar } from "./user-avatar";

type IconType = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" | "duotone" }>;

export function MyProfilePage() {
  const user = useAuthStore((state) => state.user);
  const profileQuery = useMyProfile();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  if (profileQuery.isLoading || (!profileQuery.data && !profileQuery.isError)) return <ProfileSkeleton />;
  if (profileQuery.isError) {
    return (
      <Panel className="flex flex-col items-center p-10 text-center">
        <WarningCircle aria-hidden className="h-10 w-10 text-danger" />
        <h1 className="mt-3 text-lg font-semibold text-foreground">Không tải được hồ sơ</h1>
        <p className="mt-1 text-sm text-text-secondary">{getApiErrorMessage(profileQuery.error)}</p>
        <Button className="mt-5" onClick={() => profileQuery.refetch()} variant="outline">
          Thử lại
        </Button>
      </Panel>
    );
  }

  const profile = profileQuery.data;
  const name = displayName(profile, user?.username);
  const leader = profile.leader;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hồ sơ cá nhân</h1>
        <p className="mt-1 text-sm text-text-secondary">Thông tin tài khoản và hồ sơ Huynh Trưởng của bạn.</p>
      </div>

      <Panel className="overflow-hidden">
        <div aria-hidden className="h-24 bg-gradient-to-r from-primary via-[#2563eb] to-accent sm:h-28" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <UserAvatar className="-mt-10 self-start rounded-full ring-4 ring-white" imageUrl={leader?.imageUrl} name={name} size="lg" />
            <div className="min-w-0 sm:pt-3">
              <h2 className="truncate text-xl font-semibold text-foreground">{name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-sm text-text-secondary">@{profile.username}</span>
                {leader?.leaderLevel ? (
                  <span className="inline-flex h-6 items-center rounded-full bg-[var(--badge-level-high-bg)] px-2.5 text-xs font-semibold text-[var(--badge-level-high-fg)]">
                    {formatLeaderLevel(leader.leaderLevel)}
                  </span>
                ) : null}
                {profile.roles.map((role) => (
                  <RoleChip key={role.code} name={role.name} primary={role.primary} />
                ))}
              </div>
            </div>
          </div>
          <Button className="self-start sm:mt-4" onClick={() => setPasswordOpen(true)} variant="outline">
            <Key aria-hidden className="h-4 w-4" />
            Đổi mật khẩu
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {leader ? <LeaderInfo leader={leader} /> : <NoLeaderState />}
        <AccountInfo onChangeEmail={() => setEmailOpen(true)} profile={profile} />
      </div>

      {leader ? (
        <>
          <RankHistorySection histories={profile.rankHistory ?? []} />
          <CertificatesSection certificates={profile.certificates ?? []} />
        </>
      ) : null}

      <ChangePasswordDialog onOpenChange={setPasswordOpen} open={passwordOpen} />
      {profile.hasLeader ? null : <ChangeEmailDialog currentEmail={profile.email} onOpenChange={setEmailOpen} open={emailOpen} />}
    </div>
  );
}

function LeaderInfo({ leader }: { leader: MyLeaderProfile }) {
  const facts: { icon: IconType; label: string; value: string }[] = [
    { icon: UserCircle, label: "Tên thánh", value: displayValue(leader.holyName) },
    { icon: IdentificationBadge, label: "Họ và tên", value: displayValue(leader.fullName) },
    { icon: Cake, label: "Ngày sinh", value: formatDate(leader.birthDate) },
    { icon: GenderIntersex, label: "Giới tính", value: genderLabel(leader.gender) },
    { icon: EnvelopeSimple, label: "Email", value: displayValue(leader.email) },
    { icon: Phone, label: "Số điện thoại", value: displayValue(leader.phoneNumber) },
    { icon: Church, label: "Giáo xứ / giáo họ / giáo điểm", value: displayValue(leader.parishName) },
    { icon: MapPin, label: "Giáo hạt", value: displayValue(leader.deaneryName) },
  ];
  return (
    <Panel className="p-4 sm:p-5">
      <SectionTitle icon={UserList} title="Thông tin Huynh Trưởng" />
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {facts.map((fact) => (
          <Fact key={fact.label} {...fact} />
        ))}
      </dl>
    </Panel>
  );
}

function NoLeaderState() {
  return (
    <Panel className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
        <UserList aria-hidden className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">Không có thông tin hồ sơ</h3>
      <p className="mt-1 max-w-[420px] text-sm leading-6 text-text-secondary">
        Tài khoản này chưa được gắn với Huynh Trưởng nào (ví dụ tài khoản quản trị giáo phận), nên không có hồ sơ cá nhân để hiển thị.
      </p>
    </Panel>
  );
}

function AccountInfo({ profile, onChangeEmail }: { profile: MyProfile; onChangeEmail: () => void }) {
  return (
    <Panel className="h-fit p-4 sm:p-5">
      <SectionTitle icon={ShieldCheck} title="Tài khoản" />
      <dl className="mt-4 space-y-4">
        <Fact icon={UserCircle} label="Tên đăng nhập" value={profile.username} />
        <Fact icon={EnvelopeSimple} label="Email nhận OTP" value={profile.email ?? "Chưa có email"} />
        <Fact
          icon={ShieldCheck}
          label="Vai trò"
          value={
            profile.roles.length
              ? profile.roles.map((role) => (role.primary ? `${role.name} (chính)` : role.name)).join(", ")
              : "Chưa có vai trò"
          }
        />
      </dl>
      {/* Tài khoản gắn Huynh Trưởng dùng email trong hồ sơ Huynh Trưởng nên không tự đổi tại đây. */}
      {!profile.hasLeader ? (
        <Button className="mt-4 w-full" onClick={onChangeEmail} variant="outline">
          <EnvelopeSimple aria-hidden className="h-4 w-4" />
          {profile.email ? "Đổi email" : "Thêm email"}
        </Button>
      ) : null}
      {!profile.email ? (
        <p className="mt-4 rounded-lg bg-[var(--badge-warning-bg)] px-3 py-2 text-xs leading-5 text-[var(--badge-warning-fg)]">
          {profile.hasLeader
            ? "Tài khoản chưa có email nên chưa thể đổi mật khẩu bằng OTP. Vui lòng liên hệ quản trị viên."
            : "Tài khoản chưa có email nên chưa thể đổi mật khẩu bằng OTP. Hãy thêm email ở trên."}
        </p>
      ) : null}
    </Panel>
  );
}

function Fact({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-text-secondary">
        <Icon aria-hidden className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải hồ sơ" className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-48 animate-pulse rounded-xl bg-surface-2" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-surface-2 lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
      </div>
    </div>
  );
}
