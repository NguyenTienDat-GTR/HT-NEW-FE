"use client";

import { ArrowLeft, Check, CheckCircle, EnvelopeSimple, Info, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMmSs, useCountdown } from "../hooks/use-countdown";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordStrength, strongPasswordHints } from "../password-strength";
import { OtpInput } from "./otp-input";
import { PasswordField } from "./password-field";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg bg-[var(--badge-danger-bg)] px-3 py-2 text-sm text-danger" role="alert">
      <X aria-hidden className="mt-0.5 h-4 w-4 shrink-0" weight="bold" />
      <span>{message}</span>
    </p>
  );
}

export function VerifyStep({
  error,
  loading,
  onSubmit,
  oldPassword,
  setOldPassword,
}: {
  error?: string | null;
  loading: boolean;
  onSubmit: () => void;
  oldPassword: string;
  setOldPassword: (value: string) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (oldPassword) onSubmit();
      }}
    >
      <PasswordField autoComplete="current-password" autoFocus label="Mật khẩu hiện tại" onChange={setOldPassword} value={oldPassword} />
      <p className="flex items-start gap-2 text-xs leading-5 text-text-secondary">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Sau khi xác minh, hệ thống gửi mã OTP 6 số tới email đăng ký của tài khoản.
      </p>
      <FormError message={error} />
      <Button className="w-full" disabled={!oldPassword} loading={loading} size="lg" type="submit">
        Gửi mã OTP
      </Button>
    </form>
  );
}

export function OtpStep({
  error,
  expiresAt,
  loading,
  email,
  onBack,
  onResend,
  onSubmit,
  otp,
  resendAt,
  resending,
  setOtp,
}: {
  error?: string | null;
  expiresAt: number | null;
  loading: boolean;
  email: string;
  onBack: () => void;
  onResend: () => void;
  onSubmit: (otp: string) => void;
  otp: string;
  resendAt: number | null;
  resending: boolean;
  setOtp: (value: string) => void;
}) {
  const expiresIn = useCountdown(expiresAt);
  const resendIn = useCountdown(resendAt);
  const expired = expiresAt !== null && expiresIn === 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (otp.length === 6) onSubmit(otp);
      }}
    >
      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/60 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <EnvelopeSimple aria-hidden className="h-5 w-5" />
        </span>
        <p className="text-sm leading-5 text-text-secondary">
          Mã OTP đã được gửi tới <span className="break-all font-semibold text-foreground">{email}</span>. Kiểm tra cả thư mục spam nếu
          chưa thấy email.
        </p>
      </div>

      <OtpInput
        disabled={loading || expired}
        invalid={Boolean(error)}
        onChange={setOtp}
        onComplete={(value) => {
          if (!loading) onSubmit(value);
        }}
        value={otp}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span aria-live="polite" className={cn("tabular-nums", expired ? "font-medium text-danger" : "text-text-secondary")}>
          {expired ? "Mã đã hết hạn, vui lòng gửi lại" : `Mã hết hạn sau ${formatMmSs(expiresIn)}`}
        </span>
        <button
          className="min-h-9 cursor-pointer rounded-md px-2 font-semibold text-primary transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
          disabled={resendIn > 0 || resending}
          onClick={onResend}
          type="button"
        >
          {resending ? "Đang gửi..." : resendIn > 0 ? `Gửi lại mã (${resendIn}s)` : "Gửi lại mã"}
        </button>
      </div>

      <FormError message={error} />

      <div className="flex gap-3">
        <Button onClick={onBack} size="lg" type="button" variant="outline">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Quay lại
        </Button>
        <Button className="flex-1" disabled={otp.length !== 6 || expired} loading={loading} size="lg" type="submit">
          Xác nhận mã
        </Button>
      </div>
    </form>
  );
}

export function NewPasswordStep({
  error,
  loading,
  oldPassword,
  onSubmit,
  submitLabel = "Đổi mật khẩu",
}: {
  error?: string | null;
  loading: boolean;
  /** Không truyền khi quên mật khẩu (không có mật khẩu hiện tại để so sánh). */
  oldPassword?: string;
  onSubmit: (newPassword: string, confirmPassword: string) => void;
  submitLabel?: string;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const strength = passwordStrength(newPassword);

  const rules = [
    {
      ok: newPassword.length >= PASSWORD_MIN_LENGTH && newPassword.length <= PASSWORD_MAX_LENGTH,
      label: `Từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự`,
    },
    ...(oldPassword !== undefined ? [{ ok: newPassword.length > 0 && newPassword !== oldPassword, label: "Khác mật khẩu hiện tại" }] : []),
    { ok: confirmPassword.length > 0 && confirmPassword === newPassword, label: "Mật khẩu xác nhận khớp" },
  ];
  const hints = strongPasswordHints.map((hint) => ({ ok: hint.test(newPassword), label: hint.label }));
  const valid = rules.every((rule) => rule.ok);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit(newPassword, confirmPassword);
      }}
    >
      <div>
        <PasswordField autoComplete="new-password" autoFocus label="Mật khẩu mới" onChange={setNewPassword} value={newPassword} />
        {newPassword ? (
          <div className="mt-2 flex items-center gap-2" aria-live="polite">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3].map((level) => (
                <span
                  className={cn("h-1.5 flex-1 rounded-full transition-colors duration-200", level <= strength.level ? strength.color : "bg-surface-2")}
                  key={level}
                />
              ))}
            </div>
            <span className={cn("text-xs font-medium", strength.text)}>Độ mạnh: {strength.label}</span>
          </div>
        ) : null}
      </div>
      <PasswordField
        autoComplete="new-password"
        error={mismatch ? "Mật khẩu xác nhận không khớp" : undefined}
        label="Xác nhận mật khẩu mới"
        onChange={setConfirmPassword}
        value={confirmPassword}
      />
      <div className="grid gap-3 rounded-lg bg-surface-2/60 p-3 sm:grid-cols-2">
        <ChecklistGroup items={rules} title="Bắt buộc" />
        <ChecklistGroup items={hints} title="Gợi ý mật khẩu mạnh" variant="hint" />
      </div>
      <FormError message={error} />
      <Button className="w-full" disabled={!valid} loading={loading} size="lg" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
}

function ChecklistGroup({
  items,
  title,
  variant = "rule",
}: {
  items: { ok: boolean; label: string }[];
  title: string;
  variant?: "rule" | "hint";
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="space-y-1.5 text-xs">
        {items.map((item) => (
          <li className={cn("flex items-center gap-2", item.ok ? "text-[var(--success)]" : "text-text-secondary")} key={item.label}>
            <span
              className={cn(
                "grid h-4 w-4 shrink-0 place-items-center rounded-full",
                item.ok ? "bg-[var(--success)] text-white" : variant === "hint" ? "border border-dashed border-input bg-white" : "border border-input bg-white",
              )}
            >
              {item.ok ? <Check aria-hidden className="h-2.5 w-2.5" weight="bold" /> : null}
            </span>
            {item.label}
            <span className="sr-only">{item.ok ? "(đạt)" : "(chưa đạt)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SuccessStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--badge-success-bg)] text-[var(--success)]">
        <CheckCircle aria-hidden className="h-8 w-8" weight="fill" />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">Đổi mật khẩu thành công</p>
      <p className="mt-1 max-w-[320px] text-sm leading-6 text-text-secondary">
        Bạn vẫn đăng nhập trên thiết bị này. Các phiên đăng nhập khác đã được đăng xuất để bảo vệ tài khoản.
      </p>
      <Button autoFocus className="mt-5 w-full" onClick={onClose} size="lg" type="button">
        Hoàn tất
      </Button>
    </div>
  );
}

export function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <ol aria-label="Các bước đổi mật khẩu" className="flex items-center gap-2">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li className="flex min-w-0 flex-1 items-center gap-2" key={label}>
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-200",
                done && "bg-primary text-white",
                active && "bg-primary-soft text-primary ring-2 ring-primary",
                !done && !active && "bg-surface-2 text-muted",
              )}
            >
              {done ? <Check aria-hidden className="h-3.5 w-3.5" weight="bold" /> : index + 1}
            </span>
            <span className={cn("truncate text-xs font-medium", active || done ? "text-foreground" : "text-muted")}>{label}</span>
            {index < steps.length - 1 ? (
              <span aria-hidden className={cn("hidden h-px flex-1 sm:block", done ? "bg-primary" : "bg-border")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
