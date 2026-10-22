"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;

/** Ô nhập OTP 6 số: tự nhảy ô, hỗ trợ dán cả mã và xóa lùi. */
export function OtpInput({
  disabled,
  invalid,
  onChange,
  onComplete,
  value,
}: {
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  value: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");

  function update(next: string, focusIndex: number) {
    const clean = next.replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(clean);
    refs.current[Math.min(focusIndex, clean.length, OTP_LENGTH - 1)]?.focus();
    if (clean.length === OTP_LENGTH) onComplete?.(clean);
  }

  return (
    <div aria-label="Mã OTP gồm 6 chữ số" className="flex justify-between gap-2" role="group">
      {digits.map((digit, index) => (
        <input
          aria-label={`Chữ số ${index + 1}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={index === 0}
          className={cn(
            "h-12 w-full min-w-0 rounded-[10px] border bg-white text-center text-xl font-semibold tabular-nums text-foreground transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:bg-surface-2 sm:h-14",
            invalid ? "border-danger" : digit ? "border-primary/60" : "border-input",
          )}
          disabled={disabled}
          inputMode="numeric"
          key={index}
          maxLength={OTP_LENGTH}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, "");
            if (!typed) return;
            if (typed.length > 1) {
              update(value.slice(0, index) + typed, index + typed.length);
              return;
            }
            const chars = digits.slice();
            chars[index] = typed;
            update(chars.join(""), index + 1);
          }}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              if (digits[index]) {
                onChange(value.slice(0, index) + value.slice(index + 1));
              } else if (index > 0) {
                onChange(value.slice(0, index - 1) + value.slice(index));
                refs.current[index - 1]?.focus();
              }
            } else if (event.key === "ArrowLeft" && index > 0) {
              refs.current[index - 1]?.focus();
            } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
            if (pasted) update(pasted, pasted.length);
          }}
          pattern="[0-9]*"
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          value={digit}
        />
      ))}
    </div>
  );
}
