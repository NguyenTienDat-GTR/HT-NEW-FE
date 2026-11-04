"use client";

import {
  AlignBottomSimple,
  AlignCenterHorizontalSimple,
  AlignCenterVerticalSimple,
  AlignLeftSimple,
  AlignRightSimple,
  AlignTopSimple,
  ArrowsHorizontal,
  ArrowsVertical,
  Copy,
  Minus,
  Plus,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextItalic,
  TextUnderline,
  Trash,
  CaretDown,
  LockSimple,
  PaintBrush,
  PaintBucket,
} from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useState, type MutableRefObject, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FONT_OPTIONS, fontStack, type FontFamily, type LayoutItem } from "@/modules/certificates/components/certificate-design";
import type { LayoutUpdater } from "@/modules/certificates/components/certificate-canvas";
import { ObjectSizeControls } from "./object-controls";
import { FONT_SIZE_PRESETS_PT, ptToRatio, ratioToPt, stepFontPt } from "./font-size";
import { alignItems, applyStyle, distributeItems, duplicateItems, patchItems, removeItems, styleOf, type AlignMode, type BoxOf, type DistributeAxis, type TextStyle } from "./layout-ops";

type Props = {
  layout: LayoutItem[];
  selection: number[];
  onSelectionChange: (indexes: number[]) => void;
  onLayoutChange: (updater: LayoutUpdater, key?: string) => void;
  /** Chiều cao trang / thẻ (mm) để đổi cỡ chữ sang pt. */
  pageHeightMm: number;
  disabled?: boolean;
  /** Nút thêm phần tử đặt đầu thanh (văn bản, ảnh, mã QR). */
  leading?: ReactNode;
  /** Hàm đo hộp bao thật do khung thiết kế cung cấp (căn lề theo chiều rộng chữ thật). */
  measureRef?: MutableRefObject<BoxOf | null>;
};

const isText = (item?: LayoutItem) => item != null && (item.type === "FIELD" || item.type === "TEXT");

// Thanh định dạng kiểu Word cho khung thiết kế: phông, cỡ chữ (pt), B/I/U, màu, canh lề, căn các phần tử với nhau.
export function LayoutToolbar({ layout, selection, onSelectionChange, onLayoutChange, pageHeightMm, disabled, measureRef, leading }: Props) {
  const chosen = selection.filter((index) => layout[index]);
  const textIndexes = chosen.filter((index) => isText(layout[index]));
  const primary = textIndexes.length ? layout[textIndexes[0]] : undefined;
  // Mã QR / ảnh huynh trưởng đang chọn một mình: hiện ô kích thước ngay trên thanh công cụ.
  const only = chosen.length === 1 ? layout[chosen[0]] : undefined;
  const singleObject = only && (only.type === "QR" || only.type === "PHOTO") ? only : null;
  const none = disabled || chosen.length === 0;
  const allLocked = chosen.length > 0 && chosen.every((index) => layout[index]?.locked);
  // Cọ định dạng: lấy kiểu chữ từ một phần tử rồi dán cho nhiều phần tử khác.
  const [painter, setPainter] = useState<TextStyle | null>(null);
  const noText = disabled || textIndexes.length === 0;
  const boxOf = (item: LayoutItem, index: number) => measureRef?.current?.(item, index) ?? { left: item.x, right: item.x, top: item.y, bottom: item.y };

  // Ô cỡ chữ cho gõ tự do: giữ chữ đang gõ cho đến khi rời ô hoặc nhấn Enter.
  const [draft, setDraft] = useState<string | null>(null);
  const currentPt = primary ? ratioToPt(primary.fontSize, pageHeightMm) : 0;

  function patchText(patch: Partial<LayoutItem>, key?: string) {
    onLayoutChange((items) => patchItems(items, textIndexes, patch), key ? `${key}:${textIndexes.join(",")}` : undefined);
  }

  function setPt(pt: number) {
    if (!Number.isFinite(pt) || pt <= 0) return;
    patchText({ fontSize: ptToRatio(pt, pageHeightMm) }, "fontSize");
  }

  function commitDraft() {
    if (draft != null) setPt(Number(draft.replace(",", ".")));
    setDraft(null);
  }

  function align(mode: AlignMode) {
    onLayoutChange((items) => alignItems(items, chosen, mode, (item, index) => boxOf(item, index)));
  }

  function distribute(axis: DistributeAxis) {
    onLayoutChange((items) => distributeItems(items, chosen, axis, (item, index) => boxOf(item, index)));
  }

  function duplicate() {
    const { created } = duplicateItems(layout, chosen);
    onLayoutChange((items) => duplicateItems(items, chosen).layout);
    onSelectionChange(created);
  }

  function remove() {
    onLayoutChange((items) => removeItems(items, chosen));
    onSelectionChange([]);
  }

  return (
    <div aria-label="Thanh định dạng" className="flex flex-wrap items-center gap-1 border-b border-border bg-white px-3 py-1.5" role="toolbar">
      {leading ? (
        <>
          {leading}
          <Sep />
        </>
      ) : null}
      {singleObject ? (
        <>
          <ObjectSizeControls disabled={disabled} item={singleObject} onChange={(patch, key) => onLayoutChange((items) => patchItems(items, chosen, patch), `${key}:${chosen[0]}`)} />
          <Sep />
        </>
      ) : null}
      <select
        aria-label="Phông chữ"
        className="h-8 w-[140px] cursor-pointer rounded-lg border border-input bg-white px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={noText}
        onChange={(event) => patchText({ fontFamily: event.target.value as FontFamily })}
        style={{ fontFamily: primary ? fontStack(primary.fontFamily) : undefined }}
        value={primary?.fontFamily ?? "sans"}
      >
        {FONT_OPTIONS.map((option) => (
          <option key={option.value} style={{ fontFamily: fontStack(option.value) }} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="inline-flex items-center">
        <Btn disabled={noText} label="Giảm cỡ chữ" onClick={() => setPt(stepFontPt(currentPt, -1))}>
          <Minus size={14} />
        </Btn>
        <input
          aria-label="Cỡ chữ (pt)"
          className="h-8 w-12 rounded-lg border border-input bg-white px-1 text-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={noText}
          inputMode="decimal"
          list="layout-font-size-presets"
          onBlur={commitDraft}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            // Chọn từ danh sách gợi ý (sự kiện không có inputType) thì áp ngay.
            if (!(event.nativeEvent as InputEvent).inputType && FONT_SIZE_PRESETS_PT.some((p) => String(p) === value)) {
              setPt(Number(value));
              setDraft(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
            }
          }}
          value={draft ?? (primary ? String(currentPt) : "")}
        />
        <datalist id="layout-font-size-presets">
          {FONT_SIZE_PRESETS_PT.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <Btn disabled={noText} label="Tăng cỡ chữ" onClick={() => setPt(stepFontPt(currentPt, 1))}>
          <Plus size={14} />
        </Btn>
      </div>

      <Sep />
      <Btn active={Boolean(primary?.bold)} disabled={noText} label="In đậm" onClick={() => patchText({ bold: !primary?.bold })}>
        <TextB size={16} weight="bold" />
      </Btn>
      <Btn active={Boolean(primary?.italic)} disabled={noText} label="In nghiêng" onClick={() => patchText({ italic: !primary?.italic })}>
        <TextItalic size={16} />
      </Btn>
      <Btn active={Boolean(primary?.underline)} disabled={noText} label="Gạch chân" onClick={() => patchText({ underline: !primary?.underline })}>
        <TextUnderline size={16} />
      </Btn>
      <input
        aria-label="Màu chữ"
        className="h-8 w-8 cursor-pointer rounded-lg border border-input bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={noText}
        onChange={(event) => patchText({ color: event.target.value }, "color")}
        type="color"
        value={primary?.color ?? "#000000"}
      />
      <Sep />
      {(
        [
          ["left", "Canh chữ trái", <TextAlignLeft key="l" size={16} />],
          ["center", "Canh chữ giữa", <TextAlignCenter key="c" size={16} />],
          ["right", "Canh chữ phải", <TextAlignRight key="r" size={16} />],
        ] as const
      ).map(([value, label, icon]) => (
        <Btn active={primary?.align === value} disabled={noText} key={value} label={label} onClick={() => patchText({ align: value })}>
          {icon}
        </Btn>
      ))}
      <Sep />
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            aria-label="Căn chỉnh phần tử"
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-0.5 rounded-lg border border-transparent px-1.5 text-text-secondary hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={none}
            onMouseDown={(event) => event.preventDefault()}
            title="Căn chỉnh phần tử (một phần tử căn theo trang, nhiều phần tử căn với nhau)"
            type="button"
          >
            <AlignLeftSimple size={16} /> <CaretDown size={11} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" className="z-50 w-[250px] rounded-xl border border-border bg-white p-2 shadow-[var(--shadow-card)]" collisionPadding={12} sideOffset={6}>
            <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{chosen.length > 1 ? "Căn các phần tử với nhau" : "Căn theo trang"}</p>
            <div className="grid grid-cols-2 gap-1">
              <MenuItem icon={<AlignLeftSimple size={16} />} label="Sát trái" onClick={() => align("left")} />
              <MenuItem icon={<AlignTopSimple size={16} />} label="Sát trên" onClick={() => align("top")} />
              <MenuItem icon={<AlignCenterHorizontalSimple size={16} />} label="Giữa ngang" onClick={() => align("centerX")} />
              <MenuItem icon={<AlignCenterVerticalSimple size={16} />} label="Giữa dọc" onClick={() => align("middleY")} />
              <MenuItem icon={<AlignRightSimple size={16} />} label="Sát phải" onClick={() => align("right")} />
              <MenuItem icon={<AlignBottomSimple size={16} />} label="Sát dưới" onClick={() => align("bottom")} />
              <MenuItem disabled={chosen.length < 3} icon={<ArrowsHorizontal size={16} />} label="Phân bố ngang" onClick={() => distribute("x")} />
              <MenuItem disabled={chosen.length < 3} icon={<ArrowsVertical size={16} />} label="Phân bố dọc" onClick={() => distribute("y")} />
            </div>
            {chosen.length < 3 ? <p className="px-1 pt-1.5 text-[11px] text-muted">Phân bố đều cần chọn từ 3 phần tử.</p> : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Sep />
      <Btn disabled={noText} label="Lấy định dạng chữ (cọ định dạng)" onClick={() => primary && setPainter(styleOf(primary))}>
        <PaintBrush size={16} />
      </Btn>
      <Btn active={Boolean(painter)} disabled={noText || !painter} label="Dán định dạng đã lấy lên phần tử đang chọn" onClick={() => painter && onLayoutChange((items) => applyStyle(items, chosen, painter))}>
        <PaintBucket size={16} />
      </Btn>
      <Btn active={allLocked} disabled={none} label={allLocked ? "Mở khóa phần tử" : "Khóa phần tử (không kéo nhầm)"} onClick={() => onLayoutChange((items) => patchItems(items, chosen, { locked: allLocked ? undefined : true }))}>
        <LockSimple size={16} weight={allLocked ? "fill" : "regular"} />
      </Btn>

      <Sep />
      <Btn disabled={none} label="Nhân bản (Ctrl+D)" onClick={duplicate}>
        <Copy size={16} />
      </Btn>
      <Btn danger disabled={none} label="Xóa (Delete)" onClick={remove}>
        <Trash size={16} />
      </Btn>
    </div>
  );
}

function Sep() {
  return <span aria-hidden className="mx-0.5 h-6 w-px bg-border" />;
}

function Btn({ active, danger, disabled, label, onClick, children }: { active?: boolean; danger?: boolean; disabled?: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      className={cn(
        "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-primary bg-primary-soft text-primary" : "border-transparent text-text-secondary hover:bg-slate-100",
        danger ? "text-danger hover:bg-danger/10" : "",
      )}
      disabled={disabled}
      // Giữ vùng chọn / tiêu điểm của khung khi bấm nút.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function MenuItem({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-[13px] text-foreground hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="text-text-secondary">{icon}</span>
      {label}
    </button>
  );
}
