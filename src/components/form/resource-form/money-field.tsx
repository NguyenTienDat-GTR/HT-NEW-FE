"use client";

import { useLayoutEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { amountFromDigits, digitsOnly, formatVndNumber, vndToWords } from "@/lib/money";

// Ô nhập số tiền Việt Nam đồng: hiển thị nhóm hàng nghìn (150.000), hậu tố ₫, và đọc số tiền bằng chữ ngay dưới ô.
// Giá trị của form là số nguyên (hoặc chuỗi rỗng khi chưa nhập); gõ / dán ký tự khác chữ số đều bị bỏ.
export function MoneyControl({
  id,
  value,
  readonly,
  placeholder,
  invalid,
  onChange,
}: {
  id: string;
  value: unknown;
  readonly?: boolean;
  placeholder?: string;
  invalid?: boolean;
  onChange: (value: number | "") => void;
}) {
  const amount = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : null;
  const display = amount === null ? "" : formatVndNumber(amount);
  const words = amount !== null && Number.isSafeInteger(amount) ? vndToWords(amount) : "";
  const inputRef = useRef<HTMLInputElement>(null);
  // Số chữ số đứng trước con trỏ lúc gõ: định dạng lại làm đổi độ dài chuỗi nên đặt lại con trỏ theo đúng chữ số đó.
  const caretDigits = useRef<number | null>(null);

  useLayoutEffect(() => {
    const wanted = caretDigits.current;
    caretDigits.current = null;
    const input = inputRef.current;
    if (wanted === null || !input || document.activeElement !== input) return;
    let position = wanted === 0 ? 0 : display.length;
    let seen = 0;
    for (let index = 0; wanted > 0 && index < display.length; index += 1) {
      if (/\d/.test(display[index])) seen += 1;
      if (seen === wanted) {
        position = index + 1;
        break;
      }
    }
    input.setSelectionRange(position, position);
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    caretDigits.current = raw.slice(0, caret).replace(/\D/g, "").length;
    onChange(amountFromDigits(digitsOnly(raw)));
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          aria-describedby={`${id}-words`}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          className="pr-9 text-right font-semibold tabular-nums"
          disabled={readonly}
          id={id}
          inputMode="numeric"
          onChange={handleChange}
          placeholder={placeholder ?? "0"}
          ref={inputRef}
          type="text"
          value={display}
        />
        <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">₫</span>
      </div>
      <p aria-live="polite" className="min-h-5 text-[13px] leading-5 text-text-secondary" id={`${id}-words`}>
        {words ? <>Bằng chữ: <span className="font-medium text-foreground">{words}</span></> : null}
      </p>
    </div>
  );
}
