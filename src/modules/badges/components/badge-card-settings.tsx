"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Callout, Field, SELECT_CLASS } from "@/modules/layout-config/form-controls";
import type { BadgeForm } from "../badge-design";
import { CARD_PRESETS, MAX_CARD_MM, MAX_GAP_MM, MAX_MARGIN_MM, MIN_CARD_MM, PAPER_SIZES, orientCard, type Orientation } from "../badge-sheet";
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

// Khổ thẻ, hướng thẻ, khổ giấy in, lề, khoảng cách, đường cắt và thẻ có mặt sau; kèm hình minh họa số thẻ trên mỗi trang.
export function BadgeCardSettings({
  form,
  disabled,
  errors,
  onChange,
}: {
  form: BadgeForm;
  disabled: boolean;
  errors: string[];
  onChange: (patch: Partial<BadgeForm>, key?: string) => void;
}) {
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
    <div className="grid gap-4 border-b border-border bg-slate-50 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Kích thước thẻ" hint="Chọn cỡ có sẵn hoặc nhập rộng × cao theo mm. Hệ thống tự tính một trang giấy xếp được bao nhiêu thẻ.">
            <select className={cn(SELECT_CLASS, "min-w-[220px]")} disabled={disabled} onChange={(event) => changePreset(event.target.value)} value={presetIdOf(form)}>
              {CARD_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
              <option value={CUSTOM}>Tùy chỉnh…</option>
            </select>
          </Field>
          <Field label="Rộng (mm)">
            <Input
              className="w-24"
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
              className="w-24"
              disabled={disabled}
              max={MAX_CARD_MM}
              min={MIN_CARD_MM}
              onChange={(event) => changeSize({ cardHeightMm: numberOr(event.target.value, form.cardHeightMm) }, "cardHeight")}
              step={0.1}
              type="number"
              value={form.cardHeightMm}
            />
          </Field>
          <Field label="Hướng thẻ">
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

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Khổ giấy in">
            <select className={SELECT_CLASS} disabled={disabled} onChange={(event) => onChange({ paperSize: event.target.value })} value={form.paperSize}>
              {PAPER_SIZES.map((paper) => (
                <option key={paper.value} value={paper.value}>{paper.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Hướng giấy">
            <select className={SELECT_CLASS} disabled={disabled} onChange={(event) => onChange({ paperOrientation: event.target.value as Orientation })} value={form.paperOrientation}>
              <option value="PORTRAIT">Dọc</option>
              <option value="LANDSCAPE">Ngang</option>
            </select>
          </Field>
          <Field label="Lề giấy (mm)">
            <Input
              className="w-24"
              disabled={disabled}
              max={MAX_MARGIN_MM}
              min={0}
              onChange={(event) => onChange({ marginMm: numberOr(event.target.value, form.marginMm) }, "margin")}
              step={1}
              type="number"
              value={form.marginMm}
            />
          </Field>
          <Field label="Khoảng cách thẻ (mm)">
            <Input
              className="w-28"
              disabled={disabled}
              max={MAX_GAP_MM}
              min={0}
              onChange={(event) => onChange({ gapMm: numberOr(event.target.value, form.gapMm) }, "gap")}
              step={0.5}
              type="number"
              value={form.gapMm}
            />
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
      <div className="min-w-0">
        <BadgeSheetPreview form={form} />
      </div>
    </div>
  );
}
