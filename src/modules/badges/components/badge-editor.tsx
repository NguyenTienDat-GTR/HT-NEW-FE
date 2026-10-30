"use client";

import { BackgroundAlbumDialog } from "@/components/common/background-album-dialog";
import { Eye, Images, PencilSimple, Plus, QrCode, TextT, UserCircle, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { cn } from "@/lib/utils";
import {
  CertificateCanvas,
  DEFAULT_QR_SIZE,
  type FieldCatalogItem,
  type LayoutItem,
} from "@/modules/certificates/components/certificate-design";
import { cardAspect, sampleBadgeValue, type BadgeForm, type BadgeSide } from "../badge-design";
import { BadgeLayoutInspector } from "./badge-layout-inspector";
import { Field, SELECT_CLASS } from "@/modules/layout-config/form-controls";

const BASE_ITEM = { x: 0.5, y: 0.5, fontSize: 0.1, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false } as const;

function layoutKey(side: BadgeSide) {
  return side === "front" ? "frontLayout" : "backLayout";
}

function backgroundKey(side: BadgeSide) {
  return side === "front" ? "frontBackground" : "backBackground";
}

function backgroundAssetKey(side: BadgeSide) {
  return side === "front" ? "frontBackgroundAssetId" : "backBackgroundAssetId";
}

// Vùng thiết kế thẻ: chọn mặt trước / sau, tải ảnh nền, thêm trường / văn bản / mã QR, kéo thả trên khung thẻ đúng tỉ lệ.
export function BadgeEditor({
  form,
  fields,
  canEdit,
  onChange,
}: {
  form: BadgeForm;
  fields: FieldCatalogItem[];
  canEdit: boolean;
  onChange: (updater: (current: BadgeForm) => BadgeForm, key?: string) => void;
}) {
  const [side, setSide] = useState<BadgeSide>("front");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [addFieldKey, setAddFieldKey] = useState("");

  const activeSide: BadgeSide = form.hasBack ? side : "front";
  const layout = form[layoutKey(activeSide)];
  const background = form[backgroundKey(activeSide)];
  const selected = selectedIndex != null ? (layout[selectedIndex] ?? null) : null;
  const fieldLabel = (key?: string) => fields.find((item) => item.key === key)?.label ?? key ?? "";

  function setLayout(updater: (items: LayoutItem[]) => LayoutItem[], key?: string) {
    const property = layoutKey(activeSide);
    onChange((current) => ({ ...current, [property]: updater(current[property]) }), key);
  }

  function updateItem(index: number, patch: Partial<LayoutItem>, key?: string) {
    setLayout((items) => items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)), key ? `${activeSide}:${key}:${index}` : undefined);
  }

  function addItem(item: LayoutItem) {
    setLayout((items) => [...items, item]);
    setSelectedIndex(layout.length);
  }

  function changeSide(next: BadgeSide) {
    setSide(next);
    setSelectedIndex(null);
  }

  const [albumOpen, setAlbumOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {form.hasBack ? (
            <div aria-label="Mặt thẻ" className="inline-flex rounded-lg bg-surface-2 p-1" role="tablist">
              {([["front", "Mặt trước"], ["back", "Mặt sau"]] as const).map(([value, label]) => (
                <button
                  aria-selected={activeSide === value}
                  className={cn(
                    "h-8 cursor-pointer rounded-md px-4 text-[13px] font-semibold transition-colors",
                    activeSide === value ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
                  )}
                  key={value}
                  onClick={() => changeSide(value)}
                  role="tab"
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-sm font-semibold text-foreground">Mặt trước</span>
          )}
          <Button disabled={!canEdit} onClick={() => setAlbumOpen(true)} type="button" variant="outline">
            <Images size={16} />
            {background ? "Đổi ảnh nền (album)" : "Chọn ảnh nền (album)"}
          </Button>
          <BackgroundAlbumDialog
            currentAssetId={form[backgroundAssetKey(activeSide)] || null}
            kind={activeSide === "front" ? "BADGE_FRONT" : "BADGE_BACK"}
            onOpenChange={setAlbumOpen}
            onPick={(item) =>
              onChange((current) => ({ ...current, [backgroundKey(activeSide)]: item.url, [backgroundAssetKey(activeSide)]: item.assetId }))
            }
            open={albumOpen}
          />
          {background && canEdit ? (
            <Button onClick={() => onChange((current) => ({ ...current, [backgroundKey(activeSide)]: "", [backgroundAssetKey(activeSide)]: "" }))} type="button" variant="ghost">
              <X size={14} /> Bỏ ảnh nền
            </Button>
          ) : null}
        </div>
        <div aria-label="Chế độ hiển thị" className="inline-flex rounded-lg bg-surface-2 p-1" role="group">
          <button
            aria-pressed={!preview}
            className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors", !preview ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground")}
            onClick={() => setPreview(false)}
            type="button"
          >
            <PencilSimple size={15} /> Thiết kế
          </button>
          <button
            aria-pressed={preview}
            className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors", preview ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground")}
            onClick={() => setPreview(true)}
            type="button"
          >
            <Eye size={15} /> Xem trước
          </button>
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-end gap-2 border-b border-border bg-white px-4 py-2.5">
          <Field label="Thêm phần tử">
            <select className={cn(SELECT_CLASS, "min-w-[220px]")} onChange={(event) => setAddFieldKey(event.target.value)} value={addFieldKey}>
              <option value="">— Chọn trường dữ liệu —</option>
              {fields.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.group} · {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Button
            disabled={!addFieldKey}
            onClick={() => {
              addItem({ ...BASE_ITEM, type: "FIELD", fieldKey: addFieldKey });
              setAddFieldKey("");
            }}
            type="button"
            variant="outline"
          >
            <Plus size={16} /> Thêm trường
          </Button>
          <Button onClick={() => addItem({ ...BASE_ITEM, type: "TEXT", text: "Văn bản" })} type="button" variant="outline">
            <TextT size={16} /> Văn bản
          </Button>
          <Tip label="Thêm ảnh đại diện của huynh trưởng trong hồ sơ tham dự. Ảnh lấy từ hồ sơ huynh trưởng khi xuất thẻ; huynh trưởng chưa có ảnh thì không in gì.">
            <Button onClick={() => addItem({ ...BASE_ITEM, type: "PHOTO", photoRatio: "4x6", size: 0.5, x: 0.2, y: 0.5 })} type="button" variant="outline">
              <UserCircle size={16} /> Ảnh huynh trưởng
            </Button>
          </Tip>
          <Tip label="Thêm mã QR điểm danh. Mã được tạo riêng cho từng hồ sơ trong khóa khi xuất thẻ (không lưu ảnh QR). Dùng được ở cả mặt trước và mặt sau; khóa không bật điểm danh vẫn in mã nhưng chưa quét được.">
            <Button onClick={() => addItem({ ...BASE_ITEM, type: "QR", size: DEFAULT_QR_SIZE * 2, x: 0.84, y: 0.5 })} type="button" variant="outline">
              <QrCode size={16} /> Mã QR
            </Button>
          </Tip>
          <span className="ml-auto hidden text-xs text-muted xl:block">Ctrl+Z hoàn tác · Ctrl+Y làm lại</span>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="bg-slate-100 p-3 sm:p-4">
          <div className="mx-auto" style={{ maxWidth: `${Math.min(720, Math.max(280, cardAspect(form) * 360))}px` }}>
            <CertificateCanvas
              aspect={cardAspect(form)}
              backgroundImage={background}
              editable={canEdit && !preview}
              fieldLabel={fieldLabel}
              layout={layout}
              onMove={(index, x, y) => updateItem(index, { x, y }, "move")}
              onResizePhoto={(index, patch) => updateItem(index, patch, "photoResize")}
              onSelect={setSelectedIndex}
              preview={preview}
              sampleValue={(key) => sampleBadgeValue(key, fieldLabel(key))}
              selectedIndex={selectedIndex}
            />
          </div>
          {layout.length === 0 ? <p className="mt-2 text-center text-xs text-muted">{activeSide === "front" ? "Mặt trước" : "Mặt sau"} chưa có phần tử nào. Thêm trường, văn bản hoặc mã QR ở thanh phía trên.</p> : null}
        </div>
        <aside aria-label="Thuộc tính phần tử" className="space-y-4 border-t border-border bg-white p-4 lg:border-l lg:border-t-0">
          <BadgeLayoutInspector
            disabled={!canEdit}
            fieldLabel={fieldLabel}
            item={selected}
            onChange={(patch, key) => selectedIndex != null && updateItem(selectedIndex, patch, key)}
            onRemove={() => {
              if (selectedIndex == null) return;
              setLayout((items) => items.filter((_, idx) => idx !== selectedIndex));
              setSelectedIndex(null);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
