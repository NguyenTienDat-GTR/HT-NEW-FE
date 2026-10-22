"use client";

import { Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordField({
  autoComplete,
  autoFocus,
  error,
  label,
  onChange,
  value,
}: {
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <LockKey aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
        <Input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={cn("h-11 pl-10 pr-11", error && "border-danger focus:border-danger")}
          id={id}
          maxLength={72}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeSlash className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-danger" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
