"use client";

import { CursorClick, TextB, TextItalic, TextUnderline, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FONT_OPTIONS, MAX_QR_SIZE, MIN_QR_SIZE, DEFAULT_QR_SIZE, clamp, type FontFamily, type LayoutItem } from "@/modules/certificates/components/certificate-design";
import { Field, SELECT_CLASS, StyleToggle } from "./form-controls";

// Thuộc tính của phần tử đang chọn trên thẻ (giống trình soạn chứng nhận): nội dung, kích thước mã QR, kiểu chữ, canh lề.
export function BadgeLayoutInspector({
  item,
  disabled,
  fieldLabel,
  onChange,
  onRemove,
}: {
  item: LayoutItem | null;
  disabled: boolean;
  fieldLabel: (key?: string) => string;
  onChange: (patch: Partial<LayoutItem>, key?: string) => void;
  onRemove: () => void;
}) {
  if (!item) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-center">
        <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-white text-primary shadow-sm">
          <CursorClick size={20} />
        </span>
        <p className="text-sm font-semibold text-foreground">Chưa chọn phần tử</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">Chọn một phần tử trên thẻ để chỉnh nội dung, cỡ chữ, màu và vị trí. Kéo phần tử để đổi vị trí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Phần tử đang chọn</p>
          <p className="truncate text-sm font-semibold text-foreground">
            {item.type === "TEXT" ? "Văn bản tĩnh" : item.type === "QR" ? "Mã QR điểm danh" : fieldLabel(item.fieldKey)}
          </p>
        </div>
        <Button aria-label="Xóa phần tử" className="text-danger" disabled={disabled} onClick={onRemove} size="icon" title="Xóa phần tử" type="button" variant="ghost">
          <Trash size={18} />
        </Button>
      </div>

      {item.type === "QR" ? (
        <Field
          label="Kích thước mã QR (% chiều cao thẻ)"
          hint="Mã QR chứa mã điểm danh ký số của từng hồ sơ trong khóa, tạo tự động khi xuất thẻ. Kéo để đặt vị trí (điểm kéo là tâm mã). Nên để đủ lớn và tương phản với nền để dễ quét."
        >
          <Input
            disabled={disabled}
            max={Math.round(MAX_QR_SIZE * 100)}
            min={Math.round(MIN_QR_SIZE * 100)}
            onChange={(event) => onChange({ size: clamp(Number(event.target.value) / 100, MIN_QR_SIZE, MAX_QR_SIZE) }, "qrSize")}
            type="number"
            value={Math.round((item.size ?? DEFAULT_QR_SIZE) * 100)}
          />
        </Field>
      ) : null}

      {item.type === "TEXT" ? (
        <Field label="Nội dung">
          <Input disabled={disabled} maxLength={500} onChange={(event) => onChange({ text: event.target.value }, "text")} value={item.text ?? ""} />
        </Field>
      ) : null}

      {item.type === "QR" ? null : (
        <div className="space-y-3 border-t border-border pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Kiểu chữ</p>
          <Field label="Phông chữ">
            <select className={cn(SELECT_CLASS, "w-full")} disabled={disabled} onChange={(event) => onChange({ fontFamily: event.target.value as FontFamily })} value={item.fontFamily}>
              {FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cỡ chữ (% chiều cao thẻ)">
              <Input
                disabled={disabled}
                max={30}
                min={1}
                onChange={(event) => onChange({ fontSize: clamp(Number(event.target.value) / 100, 0.005, 0.3) }, "fontSize")}
                type="number"
                value={Math.round(item.fontSize * 100)}
              />
            </Field>
            <Field label="Màu chữ">
              <input
                aria-label="Màu chữ"
                className="h-10 w-full cursor-pointer rounded-lg border border-input bg-white p-1 disabled:cursor-not-allowed"
                disabled={disabled}
                onChange={(event) => onChange({ color: event.target.value }, "color")}
                type="color"
                value={item.color}
              />
            </Field>
          </div>
          <Field label="Canh lề" hint="Tên dài sẽ tự thu nhỏ cho vừa bề ngang thẻ khi in.">
            <div aria-label="Canh lề" className="inline-flex w-full rounded-lg bg-surface-2 p-1" role="group">
              {([["left", "Trái"], ["center", "Giữa"], ["right", "Phải"]] as const).map(([value, label]) => (
                <button
                  aria-pressed={item.align === value}
                  className={cn(
                    "h-8 flex-1 cursor-pointer rounded-md text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    item.align === value ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
                  )}
                  disabled={disabled}
                  key={value}
                  onClick={() => onChange({ align: value as LayoutItem["align"] })}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex gap-2">
            <StyleToggle active={item.bold} disabled={disabled} label="In đậm" onClick={() => onChange({ bold: !item.bold })}>
              <TextB size={16} weight="bold" />
            </StyleToggle>
            <StyleToggle active={item.italic} disabled={disabled} label="In nghiêng" onClick={() => onChange({ italic: !item.italic })}>
              <TextItalic size={16} />
            </StyleToggle>
            <StyleToggle active={item.underline} disabled={disabled} label="Gạch chân" onClick={() => onChange({ underline: !item.underline })}>
              <TextUnderline size={16} />
            </StyleToggle>
          </div>
        </div>
      )}
    </div>
  );
}
