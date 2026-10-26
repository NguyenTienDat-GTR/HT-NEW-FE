"use client";

import { CheckCircle, Info, User } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/modules/account/components/change-password-steps";

export function UsernameStep({
  error,
  loading,
  onChange,
  onSubmit,
  username,
}: {
  error?: string | null;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  username: string;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (username.trim()) onSubmit();
      }}
    >
      <label className="block text-sm font-semibold text-foreground">
        Tên đăng nhập
        <span className="relative mt-1.5 block">
          <User aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <Input
            autoComplete="username"
            autoFocus
            className="h-11 pl-10"
            maxLength={100}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Nhập tên đăng nhập"
            value={username}
          />
        </span>
      </label>
      <p className="flex items-start gap-2 text-xs leading-5 text-text-secondary">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Hệ thống gửi mã OTP 6 số tới email đăng ký của tài khoản hoặc email của huynh trưởng gắn với tài khoản.
      </p>
      <FormError message={error} />
      <Button className="w-full" disabled={!username.trim()} loading={loading} size="lg" type="submit">
        Gửi mã OTP
      </Button>
      <p className="text-center text-sm">
        <Link className="font-semibold text-primary hover:underline" href="/login">
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordDoneStep() {
  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--badge-success-bg)] text-[var(--success)]">
        <CheckCircle aria-hidden className="h-8 w-8" weight="fill" />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">Đặt lại mật khẩu thành công</p>
      <p className="mt-1 max-w-[340px] text-sm leading-6 text-text-secondary">
        Mọi phiên đăng nhập cũ đã được đăng xuất để bảo vệ tài khoản. Hãy đăng nhập bằng mật khẩu mới.
      </p>
      <Button asChild className="mt-5 w-full" size="lg">
        <Link href="/login">Về trang đăng nhập</Link>
      </Button>
    </div>
  );
}
