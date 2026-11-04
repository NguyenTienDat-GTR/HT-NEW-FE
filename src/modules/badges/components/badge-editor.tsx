"use client";

import { BackgroundAlbumDialog } from "@/components/common/background-album-dialog";
import { Eye, Images, PencilSimple, QrCode, TextT, UserCircle, X } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { cn } from "@/lib/utils";
import {
  DEFAULT_QR_SIZE,
  type FieldCatalogItem,
  type LayoutItem,
} from "@/modules/certificates/components/certificate-design";
import { CertificateCanvas } from "@/modules/certificates/components/certificate-canvas";
import { LayoutToolbar } from "@/modules/layout-config/wysiwyg/layout-toolbar";
import { FieldPalette } from "@/modules/layout-config/wysiwyg/field-palette";
import type { BoxOf } from "@/modules/layout-config/wysiwyg/layout-ops";
import { cardAspect, sampleBadgeValue, type BadgeForm, type BadgeSide } from "../badge-design";
import { orientCard } from "../badge-sheet";

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
  const [selection, setSelection] = useState<number[]>([]);
  const setSelectedIndex = (index: number | null) => setSelection(index == null ? [] : [index]);
  const measureRef = useRef<BoxOf | null>(null);
  const [preview, setPreview] = useState(false);

  const activeSide: BadgeSide = form.hasBack ? side : "front";
  const layout = form[layoutKey(activeSide)];
  const background = form[backgroundKey(activeSide)];
  const fieldLabel = (key?: string) => fields.find((item) => item.key === key)?.label ?? key ?? "";

  function setLayout(updater: (items: LayoutItem[]) => LayoutItem[], key?: string) {
    const property = layoutKey(activeSide);
    onChange((current) => ({ ...current, [property]: updater(current[property]) }), key);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
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
          <Button disabled={!canEdit} onClick={() => setAlbumOpen(true)} size="sm" type="button" variant="outline">
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

      {canEdit && !preview ? (
        <LayoutToolbar
          layout={layout}
          measureRef={measureRef}
          onLayoutChange={(updater, key) => setLayout(updater, key ? `${activeSide}:${key}` : undefined)}
          onSelectionChange={setSelection}
          pageHeightMm={orientCard(form.cardWidthMm, form.cardHeightMm, form.cardOrientation).heightMm}
          selection={selection}
        />
      ) : null}

      <div className={cn("grid min-h-0 flex-1 lg:min-h-[240px]", canEdit && !preview ? "lg:grid-cols-[232px_minmax(0,1fr)]" : "")}>
        {canEdit && !preview ? (
          <aside aria-label="Trường dữ liệu" className="hidden overflow-y-auto border-r border-border bg-white p-3 lg:block">
            <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border pb-3">
        <Button onClick={() => addItem({ ...BASE_ITEM, type: "TEXT", text: "Văn bản" })} size="sm" title="Thêm văn bản tĩnh (hoặc nhấp đúp vào chỗ trống trên thẻ)" type="button" variant="outline">
          <TextT size={16} /> Văn bản
        </Button>
        <Tip label="Thêm ảnh đại diện của huynh trưởng trong hồ sơ tham dự. Ảnh lấy từ hồ sơ huynh trưởng khi xuất thẻ; huynh trưởng chưa có ảnh thì không in gì.">
          <Button onClick={() => addItem({ ...BASE_ITEM, type: "PHOTO", photoRatio: "4x6", size: 0.5, x: 0.2, y: 0.5 })} size="sm" type="button" variant="outline">
            <UserCircle size={16} /> Ảnh huynh trưởng
          </Button>
        </Tip>
        <Tip label="Thêm mã QR điểm danh. Mã được tạo riêng cho từng hồ sơ trong khóa khi xuất thẻ (không lưu ảnh QR). Dùng được ở cả mặt trước và mặt sau; khóa không bật điểm danh vẫn in mã nhưng chưa quét được.">
          <Button onClick={() => addItem({ ...BASE_ITEM, type: "QR", size: DEFAULT_QR_SIZE * 2, x: 0.84, y: 0.5 })} size="sm" type="button" variant="outline">
            <QrCode size={16} /> Mã QR
          </Button>
        </Tip>
            </div>
            <FieldPalette fields={fields} onPick={(key) => addItem({ ...BASE_ITEM, type: "FIELD", fieldKey: key })} />
          </aside>
        ) : null}
        <div className="flex min-h-[260px] min-w-0 flex-col items-center justify-center gap-2 bg-slate-100 p-3" style={{ containerType: "size" }}>
          <div style={{ width: `min(100cqw, calc((100cqh - 28px) * ${cardAspect(form)}))` }}>
            <CertificateCanvas
              aspect={cardAspect(form)}
              backgroundImage={background}
              editable={canEdit && !preview}
              fieldLabel={fieldLabel}
              layout={layout}
              measureRef={measureRef}
              onAddTextAt={(x, y) => addItem({ ...BASE_ITEM, type: "TEXT", text: "Văn bản", x, y })}
              onDropField={(fieldKey, x, y) => addItem({ ...BASE_ITEM, type: "FIELD", fieldKey, x, y })}
              onLayoutChange={(updater, key) => setLayout(updater, key ? `${activeSide}:${key}` : undefined)}
              onSelectionChange={setSelection}
              selection={selection}
              preview={preview}
              sampleValue={(key) => sampleBadgeValue(key, fieldLabel(key))}
            />
          </div>
          {layout.length === 0 ? <p className="text-center text-xs text-muted">{activeSide === "front" ? "Mặt trước" : "Mặt sau"} chưa có phần tử nào. Thêm trường, văn bản hoặc mã QR ở thanh phía trên.</p> : null}
        </div>
      </div>
    </div>
  );
}
