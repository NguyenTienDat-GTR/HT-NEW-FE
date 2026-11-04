"use client";

import { DotsSixVertical } from "@phosphor-icons/react";
import { FIELD_DRAG_TYPE } from "@/modules/certificates/components/certificate-canvas";
import type { FieldCatalogItem } from "@/modules/certificates/components/certificate-design";

// Danh sách trường dữ liệu: kéo một trường thả thẳng lên ảnh nền để thêm vào bố cục.
export function FieldPalette({ fields, onPick }: { fields: FieldCatalogItem[]; onPick?: (key: string) => void }) {
  if (fields.length === 0) return null;
  const groups = new Map<string, FieldCatalogItem[]>();
  for (const field of fields) groups.set(field.group, [...(groups.get(field.group) ?? []), field]);
  return (
    <section aria-label="Trường dữ liệu" className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Trường dữ liệu · kéo thả vào ảnh nền</p>
      {[...groups.entries()].map(([group, items]) => (
        <div key={group}>
          <p className="mb-1 text-xs font-semibold text-text-secondary">{group}</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((field) => (
              <span
                className="inline-flex cursor-grab items-center gap-0.5 rounded-full border border-border bg-slate-50 py-1 pr-2.5 pl-1 text-xs text-foreground transition-colors hover:border-primary hover:bg-primary-soft active:cursor-grabbing"
                data-field-key={field.key}
                draggable
                key={field.key}
                onDoubleClick={() => onPick?.(field.key)}
                onDragStart={(event) => {
                  event.dataTransfer.setData(FIELD_DRAG_TYPE, field.key);
                  event.dataTransfer.setData("text/plain", field.label);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                title="Kéo vào ảnh nền (hoặc nhấp đúp để thêm vào giữa)"
              >
                <DotsSixVertical className="text-muted" size={14} />
                {field.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
