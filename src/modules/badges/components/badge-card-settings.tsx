"use client";

import * as Popover from "@radix-ui/react-popover";
import { CaretDown, Ruler, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Callout, Field, SELECT_CLASS } from "@/modules/layout-config/form-controls";
import { gridOfForm, type BadgeForm } from "../badge-design";
import { CARD_PRESETS, MAX_CARD_MM, MAX_GAP_MM, MAX_MARGIN_MM, MIN_CARD_MM, PAPER_SIZES, formatMm, orientCard, type Orientation } from "../badge-sheet";
import { BadgeSheetPreview } from "./badge-sheet-preview";

const CUSTOM = "custom";

function presetIdOf(form: BadgeForm) {
  const card = orientCard(form.cardWidthMm, form.cardHeightMm, "LANDSCAPE");
  return CARD_PRESETS.find((preset) => Math.abs(preset.widthMm - card.widthMm) < 0.01 && Math.abs(preset.heightMm - card.heightMm) < 0.01)?.id ?? CUSTOM;
}

function numberOr(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

type SettingsProps = {
  form: BadgeForm;
  disabled: boolean;
  errors: string[];
  onChange: (patch: Partial<BadgeForm>, key?: string) => void;
};

// Nút gọn trên thanh công cụ: tóm tắt khổ thẻ / giấy / số thẻ mỗi trang; bấm mở bảng chỉnh khổ thẻ và giấy in.
// Nhờ vậy phần thiết kế không bị đẩy xuống dưới một khối cài đặt cao.
export function BadgeSheetSettings(props: SettingsProps) {
  const { form, errors } = props;
  const card = orientCard(form.cardWidthMm, form.cardHeightMm, form.cardOrientation);
  const grid = gridOfForm(form);
  const paper = PAPER_SIZES.find((item) => item.value === form.paperSize)?.label ?? form.paperSize;
  const summary = `Thẻ ${formatMm(card.widthMm)}×${formatMm(card.heightMm)} mm · ${paper} · ${grid ? `${grid.perPage} thẻ/trang` : "không xếp vừa"}`;
  const hasErrors = errors.length > 0;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button aria-label="Khổ thẻ và giấy in" className={cn(hasErrors ? "border-danger text-danger" : "")} size="sm" type="button" variant="outline">
          {hasErrors ? <WarningCircle size={16} weight="fill" /> : <Ruler size={16} />}
          <span className="max-w-[300px] truncate">{summary}</span>
          <CaretDown size={13} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" className="z-50 w-[min(780px,94vw)] rounded-xl border border-border bg-white shadow-[var(--shadow-card)]" collisionPadding={12} sideOffset={8}>
          <BadgeCardSettings {...props} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Khổ thẻ, hướng thẻ, khổ giấy in, lề, khoảng cách, đường cắt và thẻ có mặt sau; kèm hình minh họa số thẻ trên mỗi trang.
export function BadgeCardSettings({ form, disabled, errors, onChange }: SettingsProps) {
  function changeOrientation(orientation: Orientation) {
    const card = orientCard(form.cardWidthMm, form.cardHeightMm, orientation);
    onChange({ cardOrientation: orientation, cardWidthMm: card.widthMm, cardHeightMm: card.heightMm });
  }

  function changePreset(id: string) {
    const preset = CARD_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    const card = orientCard(preset.widthMm, preset.heightMm, form.cardOrientation);
    onChange({ cardWidthMm: card.widthMm, cardHeightMm: card.heightMm });
  }

  // Sửa tay rộng / cao: hướng thẻ theo cạnh dài nên tự cập nhật cho khớp.
  function changeSize(patch: { cardWidthMm?: number; cardHeightMm?: number }, key: string) {
    const width = patch.cardWidthMm ?? form.cardWidthMm;
    const height = patch.cardHeightMm ?? form.cardHeightMm;
    onChange({ ...patch, cardOrientation: width >= height ? "LANDSCAPE" : "PORTRAIT" }, key);
  }

  const presetHint = CARD_PRESETS.find((preset) => preset.id === presetIdOf(form))?.hint;

  return (
    <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_200px]">
      <div className="space-y-3">
        <section aria-label="Thẻ" className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Thẻ</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_88px_88px_auto]">
            <Field label="Kích thước thẻ" hint="Chọn cỡ có sẵn hoặc nhập rộng × cao theo mm. Hệ thống tự tính một trang giấy xếp được bao nhiêu thẻ." className="col-span-2 sm:col-span-1">
              <select className={cn(SELECT_CLASS, "w-full")} disabled={disabled} onChange={(event) => changePreset(event.target.value)} value={presetIdOf(form)}>
                {CARD_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
                <option value={CUSTOM}>Tùy chỉnh…</option>
              </select>
            </Field>
            <Field label="Rộng (mm)">
              <Input
                disabled={disabled}
                max={MAX_CARD_MM}
                min={MIN_CARD_MM}
                onChange={(event) => changeSize({ cardWidthMm: numberOr(event.target.value, form.cardWidthMm) }, "cardWidth")}
                step={0.1}
                type="number"
                value={form.cardWidthMm}
              />
            </Field>
            <Field label="Cao (mm)">
              <Input
                disabled={disabled}
                max={MAX_CARD_MM}
                min={MIN_CARD_MM}
                onChange={(event) => changeSize({ cardHeightMm: numberOr(event.target.value, form.cardHeightMm) }, "cardHeight")}
                step={0.1}
                type="number"
                value={form.cardHeightMm}
              />
            </Field>
            <Field label="Hướng thẻ" className="col-span-2 sm:col-span-1">
              <div aria-label="Hướng thẻ" className="inline-flex rounded-lg bg-surface-2 p-1" role="group">
                {([["LANDSCAPE", "Ngang"], ["PORTRAIT", "Dọc"]] as const).map(([value, label]) => (
                  <button
                    aria-pressed={form.cardOrientation === value}
                    className={cn(
                      "h-8 cursor-pointer rounded-md px-3 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      form.cardOrientation === value ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
                    )}
                    disabled={disabled}
                    key={value}
                    onClick={() => changeOrientation(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          {presetHint ? <p className="text-xs text-muted">{presetHint}</p> : null}
        </section>

        <section aria-label="Giấy in" className="space-y-2 border-t border-border pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Giấy in</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Khổ giấy in">
              <select className={cn(SELECT_CLASS, "w-full")} disabled={disabled} onChange={(event) => onChange({ paperSize: event.target.value })} value={form.paperSize}>
                {PAPER_SIZES.map((paper) => (
                  <option key={paper.value} value={paper.value}>{paper.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Hướng giấy">
              <select className={cn(SELECT_CLASS, "w-full")} disabled={disabled} onChange={(event) => onChange({ paperOrientation: event.target.value as Orientation })} value={form.paperOrientation}>
                <option value="PORTRAIT">Dọc</option>
                <option value="LANDSCAPE">Ngang</option>
              </select>
            </Field>
            <Field label="Lề giấy (mm)">
              <Input disabled={disabled} max={MAX_MARGIN_MM} min={0} onChange={(event) => onChange({ marginMm: numberOr(event.target.value, form.marginMm) }, "margin")} step={1} type="number" value={form.marginMm} />
            </Field>
            <Field label="Khoảng cách thẻ (mm)">
              <Input disabled={disabled} max={MAX_GAP_MM} min={0} onChange={(event) => onChange({ gapMm: numberOr(event.target.value, form.gapMm) }, "gap")} step={0.5} type="number" value={form.gapMm} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input checked={form.cropMarks} className="h-4 w-4 accent-[var(--primary)]" disabled={disabled} onChange={(event) => onChange({ cropMarks: event.target.checked })} type="checkbox" />
              Vẽ viền cắt quanh mỗi thẻ
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input checked={form.hasBack} className="h-4 w-4 accent-[var(--primary)]" disabled={disabled} onChange={(event) => onChange({ hasBack: event.target.checked })} type="checkbox" />
              Thẻ có mặt sau (in hai mặt)
            </label>
          </div>
        </section>

        {errors.length > 0 ? (
          <Callout tone="danger">
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Callout>
        ) : null}
      </div>
      <div className="min-w-0 self-start rounded-lg bg-slate-50 p-3">
        <BadgeSheetPreview form={form} />
      </div>
    </div>
  );
}
