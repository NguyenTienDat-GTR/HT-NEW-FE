"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ArrowDown, ArrowUp, Eye, EyeSlash, LockSimple, LockSimpleOpen, QrCode, SquaresFour, TextT, UserCircle, X, TextAa } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FieldCatalogItem, LayoutItem } from "@/modules/certificates/components/certificate-design";
import type { LayoutUpdater } from "@/modules/certificates/components/certificate-canvas";
import { FieldPalette } from "./field-palette";
import type { LayoutTemplate } from "./layout-templates";
import { patchItems, reorderItems } from "./layout-ops";

type Props = {
  fields: FieldCatalogItem[];
  layout: LayoutItem[];
  selection: number[];
  onSelectionChange: (indexes: number[]) => void;
  onLayoutChange: (updater: LayoutUpdater, key?: string) => void;
  onPickField: (key: string) => void;
  disabled?: boolean;
};

// Cột bên trái của trình thiết kế: thêm phần tử, danh sách trường (kéo thả) và danh sách lớp (ẩn / khóa / đổi thứ tự).
export function LayoutSidebar({ fields, layout, selection, onSelectionChange, onLayoutChange, onPickField, disabled }: Props) {
  const [tab, setTab] = useState<"fields" | "layers">("fields");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border p-3">
        <div aria-label="Danh sách" className="flex rounded-lg bg-surface-2 p-0.5" role="tablist">
          {(
            [
              ["fields", "Trường"],
              ["layers", `Lớp (${layout.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-selected={tab === value}
              className={cn(
                "h-8 flex-1 cursor-pointer rounded-md text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                tab === value ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
              )}
              key={value}
              onClick={() => setTab(value)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "fields" ? (
          <FieldPalette fields={fields} onPick={onPickField} />
        ) : (
          <LayersList disabled={disabled} fields={fields} layout={layout} onLayoutChange={onLayoutChange} onSelectionChange={onSelectionChange} selection={selection} />
        )}
      </div>
    </div>
  );
}

function itemName(item: LayoutItem, fields: FieldCatalogItem[]): string {
  if (item.type === "QR") return "Mã QR";
  if (item.type === "PHOTO") return "Ảnh huynh trưởng";
  if (item.type === "TEXT") return item.text?.trim() ? item.text : "(Văn bản trống)";
  return fields.find((field) => field.key === item.fieldKey)?.label ?? item.fieldKey ?? "Trường";
}

function ItemIcon({ item }: { item: LayoutItem }) {
  if (item.type === "QR") return <QrCode size={15} />;
  if (item.type === "PHOTO") return <UserCircle size={15} />;
  if (item.type === "TEXT") return <TextT size={15} />;
  return <TextAa size={15} />;
}

// Lớp trên cùng nằm đầu danh sách (thứ tự vẽ = thứ tự trong bố cục; phần tử sau vẽ đè lên phần tử trước).
function LayersList({ layout, fields, selection, onSelectionChange, onLayoutChange, disabled }: Pick<Props, "layout" | "fields" | "selection" | "onSelectionChange" | "onLayoutChange" | "disabled">) {
  if (layout.length === 0) {
    return <p className="rounded-lg border border-dashed border-border bg-slate-50 p-3 text-center text-xs leading-5 text-text-secondary">Chưa có phần tử nào. Kéo trường vào ảnh nền hoặc dùng các nút thêm ở trên.</p>;
  }
  const rows = layout.map((item, index) => ({ item, index })).reverse();
  return (
    <ul aria-label="Danh sách lớp" className="space-y-1">
      {rows.map(({ item, index }) => {
        const selected = selection.includes(index);
        return (
          <li
            className={cn("flex flex-col gap-0.5 rounded-lg border px-1.5 py-1 text-xs", selected ? "border-primary bg-primary-soft" : "border-border bg-white", item.hidden ? "opacity-60" : "")}
            key={index}
          >
            <button
              className="flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              onClick={(event) => onSelectionChange(event.shiftKey ? (selected ? selection.filter((i) => i !== index) : [...selection, index]) : [index])}
              type="button"
            >
              <span className="shrink-0 text-text-secondary">
                <ItemIcon item={item} />
              </span>
              <span className="min-w-0 flex-1 break-words font-medium leading-4 text-foreground" title={itemName(item, fields)}>{itemName(item, fields)}</span>
            </button>
            <div className="flex items-center justify-end gap-0.5">
            <IconButton
              disabled={disabled}
              label={item.hidden ? "Hiện phần tử" : "Ẩn phần tử (không in)"}
              onClick={() => onLayoutChange((items) => patchItems(items, [index], { hidden: item.hidden ? undefined : true }))}
            >
              {item.hidden ? <EyeSlash size={15} /> : <Eye size={15} />}
            </IconButton>
            <IconButton
              disabled={disabled}
              label={item.locked ? "Mở khóa phần tử" : "Khóa phần tử"}
              onClick={() => onLayoutChange((items) => patchItems(items, [index], { locked: item.locked ? undefined : true }))}
            >
              {item.locked ? <LockSimple size={15} weight="fill" /> : <LockSimpleOpen size={15} />}
            </IconButton>
            <IconButton
              disabled={disabled || index === layout.length - 1}
              label="Đưa lên trên một lớp"
              onClick={() => {
                const result = reorderItems(layout, [index], "forward");
                onLayoutChange(() => result.layout);
                onSelectionChange(result.selection);
              }}
            >
              <ArrowUp size={15} />
            </IconButton>
            <IconButton
              disabled={disabled || index === 0}
              label="Đưa xuống dưới một lớp"
              onClick={() => {
                const result = reorderItems(layout, [index], "backward");
                onLayoutChange(() => result.layout);
                onSelectionChange(result.selection);
              }}
            >
              <ArrowDown size={15} />
            </IconButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

// Chọn mẫu bố cục dựng sẵn. Áp mẫu thay toàn bộ bố cục hiện tại (hoàn tác được bằng Ctrl+Z).
export function TemplatePicker({ templates, onApply, hasContent, disabled, compact }: { templates: LayoutTemplate[]; onApply: (items: LayoutItem[]) => void; hasContent: boolean; disabled?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<LayoutTemplate | null>(null);
  function apply(template: LayoutTemplate) {
    onApply(template.items.map((item) => ({ ...item })));
    setPending(null);
    setOpen(false);
  }
  return (
    <Dialog.Root onOpenChange={(next) => { setOpen(next); if (!next) setPending(null); }} open={open}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
      <Dialog.Trigger asChild>
        <button
          aria-label="Mẫu bố cục"
          className={compact ? "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-input bg-white text-foreground shadow-sm hover:bg-slate-50 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" : "inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-input bg-white px-3 text-[13px] font-semibold text-foreground shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"}
          disabled={disabled}
          type="button"
        >
          <SquaresFour size={compact ? 17 : 16} />{compact ? null : " Mẫu bố cục"}
        </button>
      </Dialog.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="z-[60] max-w-xs rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-card)]" sideOffset={8}>
            Chọn mẫu bố cục dựng sẵn rồi chỉnh tiếp
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(520px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base font-semibold text-foreground">Mẫu bố cục dựng sẵn</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">Chọn một mẫu để bắt đầu rồi chỉnh tiếp. Mẫu thay toàn bộ bố cục đang soạn; bạn vẫn hoàn tác được bằng Ctrl+Z.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Đóng" className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary hover:bg-slate-100">
              <X size={16} />
            </Dialog.Close>
          </div>
          <ul className="mt-4 space-y-2">
            {templates.map((template) => (
              <li className="rounded-lg border border-border p-3" key={template.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{template.label}</p>
                    <p className="text-xs leading-5 text-text-secondary">{template.description}</p>
                  </div>
                  {pending?.id === template.id ? (
                    <div className="flex shrink-0 gap-1.5">
                      <button className="h-8 cursor-pointer rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover" onClick={() => apply(template)} type="button">
                        Thay bố cục
                      </button>
                      <button className="h-8 cursor-pointer rounded-lg border border-input px-3 text-xs font-semibold hover:bg-slate-50" onClick={() => setPending(null)} type="button">
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      className="h-8 shrink-0 cursor-pointer rounded-lg border border-input px-3 text-xs font-semibold text-primary hover:bg-primary-soft"
                      onClick={() => (hasContent ? setPending(template) : apply(template))}
                      type="button"
                    >
                      Dùng mẫu
                    </button>
                  )}
                </div>
                {pending?.id === template.id ? <p className="mt-2 text-xs text-warning">Bố cục hiện tại ({layoutCount(hasContent)}) sẽ bị thay thế.</p> : null}
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function layoutCount(hasContent: boolean) {
  return hasContent ? "đang có phần tử" : "trống";
}
