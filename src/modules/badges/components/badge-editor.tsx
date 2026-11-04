"use client";

import { BackgroundAlbumDialog } from "@/components/common/background-album-dialog";
import * as Popover from "@radix-ui/react-popover";
import { CaretDown, Copy, Eye, Images, PencilSimple, QrCode, TextT, UserCircle, X } from "@phosphor-icons/react";
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
import { LayoutSidebar } from "@/modules/layout-config/wysiwyg/layout-sidebar";
import { DesignStage } from "@/modules/layout-config/wysiwyg/design-stage";
import { ShortcutsHelp, WarningsButton } from "@/modules/layout-config/wysiwyg/warnings-button";
import { useStageView } from "@/modules/layout-config/wysiwyg/stage-view";
import { useLayoutWarnings, useSampleSet } from "@/modules/layout-config/wysiwyg/use-designer-support";
import { BADGE_TEMPLATES } from "@/modules/layout-config/wysiwyg/layout-templates";
import { BADGE_SAMPLE_SETS, type BadgeSampleSet } from "../badge-sample-values";
import { mirrorLayout, type BoxOf } from "@/modules/layout-config/wysiwyg/layout-ops";
import { SELECT_CLASS } from "@/modules/layout-config/form-controls";
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
  sample: sharedSample,
}: {
  form: BadgeForm;
  fields: FieldCatalogItem[];
  canEdit: boolean;
  onChange: (updater: (current: BadgeForm) => BadgeForm, key?: string) => void;
  /** Bộ dữ liệu mẫu dùng chung với nút xuất PDF xem trước (không truyền thì tự quản lý). */
  sample?: ReturnType<typeof useSampleSet<BadgeSampleSet>>;
}) {
  const [side, setSide] = useState<BadgeSide>("front");
  const [selection, setSelection] = useState<number[]>([]);
  const setSelectedIndex = (index: number | null) => setSelection(index == null ? [] : [index]);
  const measureRef = useRef<BoxOf | null>(null);
  const [preview, setPreview] = useState(false);
  const { view, setView } = useStageView("layout-view:badge");
  const ownSample = useSampleSet("layout-sample:badge", BADGE_SAMPLE_SETS);
  const sample = sharedSample ?? ownSample;
  const [backgroundInfo, setBackgroundInfo] = useState<{ naturalWidth: number; naturalHeight: number } | null>(null);

  const activeSide: BadgeSide = form.hasBack ? side : "front";
  const layout = form[layoutKey(activeSide)];
  const background = form[backgroundKey(activeSide)];
  const fieldLabel = (key?: string) => fields.find((item) => item.key === key)?.label ?? key ?? "";
  const cardMm = (() => {
    const card = orientCard(form.cardWidthMm, form.cardHeightMm, form.cardOrientation);
    return { w: card.widthMm, h: card.heightMm };
  })();
  const warnings = useLayoutWarnings({
    layout,
    pageWidthMm: cardMm.w,
    pageHeightMm: cardMm.h,
    sampleValues: sample.values,
    safeMm: view.safeMm,
    background: backgroundInfo,
    hasBackground: Boolean(background),
  });

  function setLayout(updater: (items: LayoutItem[]) => LayoutItem[], key?: string) {
    const property = layoutKey(activeSide);
    onChange((current) => ({ ...current, [property]: updater(current[property]) }), key);
  }

  function addItem(item: LayoutItem) {
    setLayout((items) => [...items, item]);
    setSelectedIndex(layout.length);
  }

  // Sao chép bố cục giữa hai mặt; hỏi lại nếu mặt đích đã có phần tử (hoàn tác được bằng Ctrl+Z).
  function copySide(from: BadgeSide, to: BadgeSide, mirror: boolean) {
    if (form[layoutKey(to)].length > 0 && !window.confirm(`Mặt ${to === "front" ? "trước" : "sau"} đang có phần tử. Thay bằng bố cục sao chép?`)) return;
    onChange((current) => {
      const source = current[layoutKey(from)];
      return { ...current, [layoutKey(to)]: mirror ? mirrorLayout(source) : source.map((item) => ({ ...item })) };
    });
    setSide(to);
    setSelection([]);
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
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && form.hasBack ? <CopySideMenu activeSide={activeSide} onCopy={copySide} /> : null}
          <label className="sr-only" htmlFor="badge-sample-set">
            Dữ liệu mẫu
          </label>
          <select
            className={cn(SELECT_CLASS, "h-9 max-w-[190px]")}
            id="badge-sample-set"
            onChange={(event) => sample.setSampleId(event.target.value)}
            title="Dữ liệu mẫu để xem trước, thử tràn chữ và xuất PDF xem trước"
            value={sample.sampleId}
          >
            {sample.sets.map((set) => (
              <option key={set.id} value={set.id}>
                Mẫu: {set.label}
              </option>
            ))}
          </select>
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
          <aside aria-label="Trường dữ liệu và lớp" className="hidden min-h-0 border-r border-border bg-white lg:block">
            <LayoutSidebar
              actions={
                <>
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
                </>
              }
              fields={fields}
              layout={layout}
              onApplyTemplate={(items) => setLayout(() => items)}
              onLayoutChange={(updater, key) => setLayout(updater, key ? `${activeSide}:${key}` : undefined)}
              onPickField={(key) => addItem({ ...BASE_ITEM, type: "FIELD", fieldKey: key })}
              onSelectionChange={setSelection}
              selection={selection}
              templates={BADGE_TEMPLATES}
            />
          </aside>
        ) : null}
        <div className="relative min-h-[260px] min-w-0">
          {layout.length === 0 ? (
            <p className="pointer-events-none absolute bottom-3 left-3 z-30 max-w-[45%] rounded-lg bg-white/90 px-2.5 py-1.5 text-xs text-text-secondary shadow">
              {activeSide === "front" ? "Mặt trước" : "Mặt sau"} chưa có phần tử nào. Thêm trường, văn bản hoặc mã QR ở cột bên trái.
            </p>
          ) : null}
          <DesignStage
            aspect={cardAspect(form)}
            controls={
              <>
                <WarningsButton onSelect={setSelection} warnings={warnings} />
                <ShortcutsHelp />
              </>
            }
            onViewChange={setView}
            pageMm={cardMm}
            view={view}
          >
            {(extras) => (
              <CertificateCanvas
                aspect={cardAspect(form)}
                backgroundImage={background}
                bgOpacity={extras.bgOpacity}
                editable={canEdit && !preview}
                fieldLabel={fieldLabel}
                gridStep={extras.gridStep}
                guides={extras.guides}
                layout={layout}
                measureRef={measureRef}
                onAddTextAt={(x, y) => addItem({ ...BASE_ITEM, type: "TEXT", text: "Văn bản", x, y })}
                onBackgroundInfo={setBackgroundInfo}
                onDropField={(fieldKey, x, y) => addItem({ ...BASE_ITEM, type: "FIELD", fieldKey, x, y })}
                onLayoutChange={(updater, key) => setLayout(updater, key ? `${activeSide}:${key}` : undefined)}
                onSelectionChange={setSelection}
                pageMm={extras.pageMm}
                preview={preview}
                safeMm={extras.safeMm}
                sampleValue={(key) => sampleBadgeValue(key, fieldLabel(key), sample.values)}
                selection={selection}
                snapToGrid={extras.snapToGrid}
              />
            )}
          </DesignStage>
        </div>
      </div>
    </div>
  );
}

// Sao chép bố cục sang mặt kia của thẻ: giữ nguyên hoặc lật gương (hợp với thẻ in hai mặt dùng chung hoa văn).
function CopySideMenu({ activeSide, onCopy }: { activeSide: BadgeSide; onCopy: (from: BadgeSide, to: BadgeSide, mirror: boolean) => void }) {
  const other: BadgeSide = activeSide === "front" ? "back" : "front";
  const name = (side: BadgeSide) => (side === "front" ? "mặt trước" : "mặt sau");
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button size="sm" title="Sao chép bố cục sang mặt kia của thẻ" type="button" variant="outline">
          <Copy size={16} /> Sao chép mặt <CaretDown size={12} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" className="z-50 w-[280px] rounded-xl border border-border bg-white p-2 shadow-[var(--shadow-card)]" collisionPadding={12} sideOffset={6}>
          <button className="block w-full cursor-pointer rounded-lg px-2 py-2 text-left text-[13px] hover:bg-slate-100" onClick={() => onCopy(activeSide, other, false)} type="button">
            Chép {name(activeSide)} sang {name(other)}
            <span className="block text-xs text-text-secondary">Giữ nguyên vị trí</span>
          </button>
          <button className="block w-full cursor-pointer rounded-lg px-2 py-2 text-left text-[13px] hover:bg-slate-100" onClick={() => onCopy(activeSide, other, true)} type="button">
            Chép lật gương {name(activeSide)} sang {name(other)}
            <span className="block text-xs text-text-secondary">Đổi trái ↔ phải, hợp khi in hai mặt đối xứng</span>
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
