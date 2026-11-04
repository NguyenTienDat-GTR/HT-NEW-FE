"use client";

import { BackgroundAlbumDialog } from "@/components/common/background-album-dialog";
import { ArrowClockwise, ArrowCounterClockwise, ClockCounterClockwise, Eye, PencilSimple, QrCode, TextT, Images, UserCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Tip } from "@/components/ui/tip";
import type {  } from "@/config/routes/routes";
import { cn } from "@/lib/utils";
import { useUndoHistory } from "../undo-history";
import { CertificateCanvas, type LayoutUpdater } from "./certificate-canvas";
import { PAPER_OPTIONS, MAX_NAME_LENGTH, paperAspect, paperHeightMm, sampleValue, type DesignForm, type FieldCatalogItem } from "./certificate-design";
import { LayoutToolbar } from "@/modules/layout-config/wysiwyg/layout-toolbar";
import { PreviewPdfButton } from "@/modules/layout-config/wysiwyg/preview-pdf-button";
import { CERTIFICATE_SAMPLE_VALUES } from "../certificate-sample-values";
import { FieldPalette } from "@/modules/layout-config/wysiwyg/field-palette";
import type { BoxOf } from "@/modules/layout-config/wysiwyg/layout-ops";
import { SELECT_CLASS } from "@/modules/layout-config/form-controls";
import { useRef } from "react";

export function CertificateDesignerPanel({
  actions,
  addPhoto,
  addQr,
  addText,
  addTextAt,
  dropField,
  albumOpen,
  canEditCurrent,
  dirty,
  fieldLabel,
  fieldsQuery,
  form,
  history,
  isNew,
  nameTooLong,
  preview,
  redo,
  restoreSaved,
  setAlbumOpen,
  setPreview,
  selection,
  setSelection,
  updateLayout,
  undo,
  updateForm,
}: {
  addPhoto: () => void;
  addQr: () => void;
  addText: () => void;
  addTextAt: (x: number, y: number) => void;
  dropField: (fieldKey: string, x: number, y: number) => void;
  selection: number[];
  setSelection: (indexes: number[]) => void;
  updateLayout: (updater: LayoutUpdater, key?: string) => void;
  albumOpen: boolean;
  canEditCurrent: boolean;
  dirty: boolean;
  fieldLabel: (key?: string) => string;
  fieldsQuery: { data?: FieldCatalogItem[] };
  form: DesignForm;
  history: ReturnType<typeof useUndoHistory<DesignForm>>;
  isNew: boolean;
  nameTooLong: boolean;
  preview: boolean;
  redo: () => void;
  restoreSaved: () => void;
  actions?: React.ReactNode;
  setAlbumOpen: (open: boolean) => void;
  setPreview: (preview: boolean) => void;
  undo: () => void;
  updateForm: (patch: Partial<DesignForm>, key?: string) => void;
}) {
  const measureRef = useRef<BoxOf | null>(null);
  const canDesign = canEditCurrent && !preview;
  const pageAspect = paperAspect(form.paperSize, form.orientation);
  return (
    // Bàn làm việc: toàn bộ chức năng nằm trong một màn hình; chỉ cột trường và cột thuộc tính tự cuộn.
    <Panel className="flex flex-col overflow-hidden lg:h-[calc(100dvh-10.5rem)] lg:min-h-[520px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2">
        <div className="flex min-w-[220px] max-w-sm flex-1 items-center gap-1.5">
          <label className="sr-only" htmlFor="certificate-config-name">
            Tên cấu hình
          </label>
          <Input
            aria-invalid={nameTooLong}
            className="h-9"
            disabled={!canEditCurrent}
            id="certificate-config-name"
            maxLength={MAX_NAME_LENGTH + 20}
            onChange={(event) => updateForm({ name: event.target.value }, "name")}
            placeholder="Tên cấu hình, ví dụ: Mẫu huynh trưởng cấp I"
            value={form.name}
          />
          <HelpTip label="Hướng dẫn tên cấu hình">
            Trùng tên sẽ tự thêm hậu tố (1), (2)… Người ký được chọn khi <span className="font-semibold">duyệt từng chứng nhận</span> và ghi trực tiếp vào chứng nhận đó; khi xuất PDF sẽ dùng người ký của chính chứng nhận.
          </HelpTip>
          {dirty ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--badge-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--badge-warning-fg)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
              Chưa lưu
            </span>
          ) : null}
        </div>
        {nameTooLong ? (
          <p className="text-xs text-danger" role="alert">
            Tên tối đa {MAX_NAME_LENGTH} ký tự.
          </p>
        ) : null}

        <select aria-label="Khổ giấy" className={cn(SELECT_CLASS, "h-9")} disabled={!canEditCurrent} onChange={(event) => updateForm({ paperSize: event.target.value })} title="Khổ giấy" value={form.paperSize}>
          {PAPER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select aria-label="Hướng in" className={cn(SELECT_CLASS, "h-9")} disabled={!canEditCurrent} onChange={(event) => updateForm({ orientation: event.target.value })} title="Hướng in" value={form.orientation}>
          <option value="LANDSCAPE">Giấy ngang</option>
          <option value="PORTRAIT">Giấy dọc</option>
        </select>
        <Button disabled={!canEditCurrent} onClick={() => setAlbumOpen(true)} size="sm" type="button" variant="outline">
          <Images size={16} />
          {form.backgroundImage ? "Đổi ảnh nền" : "Chọn ảnh nền"}
        </Button>
        <BackgroundAlbumDialog
          currentAssetId={form.backgroundAssetId || null}
          kind="CERTIFICATE"
          onOpenChange={setAlbumOpen}
          onPick={(item) => updateForm({ backgroundImage: item.url, backgroundAssetId: item.assetId })}
          open={albumOpen}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div aria-label="Chế độ hiển thị" className="inline-flex rounded-lg bg-surface-2 p-0.5" role="group">
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
          <Button aria-label="Hoàn tác" className="h-9 w-9" disabled={!canEditCurrent || !history.canUndo} onClick={undo} size="icon" title="Hoàn tác (Ctrl+Z)" type="button" variant="icon">
            <ArrowCounterClockwise size={17} />
          </Button>
          <Button aria-label="Làm lại" className="h-9 w-9" disabled={!canEditCurrent || !history.canRedo} onClick={redo} size="icon" title="Làm lại (Ctrl+Y)" type="button" variant="icon">
            <ArrowClockwise size={17} />
          </Button>
          <Button disabled={!canEditCurrent || !dirty} onClick={restoreSaved} size="sm" title={isNew ? "Xóa toàn bộ nội dung đang soạn" : "Khôi phục về bản đã lưu"} type="button" variant="outline">
            <ClockCounterClockwise size={16} /> {isNew ? "Làm mới" : "Khôi phục"}
          </Button>
          <PreviewPdfButton
            buildBody={() => ({
              paperSize: form.paperSize,
              orientation: form.orientation,
              backgroundAssetId: form.backgroundAssetId || null,
              fieldLayout: form.layout,
              values: CERTIFICATE_SAMPLE_VALUES,
            })}
            fallbackName="xem-truoc-chung-nhan.pdf"
            path="/certificates/config/preview-pdf"
          />
          <span aria-hidden className="hidden h-6 w-px bg-border xl:block" />
          {actions}
        </div>
      </div>

      {canDesign ? (
        <LayoutToolbar
          layout={form.layout}
          measureRef={measureRef}
          onLayoutChange={updateLayout}
          onSelectionChange={setSelection}
          pageHeightMm={paperHeightMm(form.paperSize, form.orientation)}
          selection={selection}
        />
      ) : null}

      <div className={cn("grid min-h-0 flex-1", canDesign ? "lg:grid-cols-[232px_minmax(0,1fr)]" : "")}>
        {canDesign ? (
          <aside aria-label="Trường dữ liệu" className="hidden overflow-y-auto border-r border-border bg-white p-3 lg:block">
            <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border pb-3">
        <Button onClick={addText} size="sm" title="Thêm văn bản tĩnh (hoặc nhấp đúp vào chỗ trống trên ảnh)" type="button" variant="outline">
          <TextT size={16} /> Văn bản
        </Button>
        <Tip label="Thêm ảnh đại diện của huynh trưởng nhận chứng nhận. Ảnh lấy từ hồ sơ huynh trưởng khi xuất PDF; huynh trưởng chưa có ảnh thì không in gì.">
          <Button onClick={addPhoto} size="sm" type="button" variant="outline">
            <UserCircle size={16} /> Ảnh HT
          </Button>
        </Tip>
        <Tip label="Thêm mã QR chứa mã chứng nhận. Chỉ khi bố cục có mã QR thì khi xuất PDF hệ thống mới tạo mã QR (không lưu lại).">
          <Button onClick={addQr} size="sm" type="button" variant="outline">
            <QrCode size={16} /> Mã QR
          </Button>
        </Tip>
            </div>
            <FieldPalette fields={fieldsQuery.data ?? []} onPick={(key) => dropField(key, 0.5, 0.5)} />
          </aside>
        ) : null}

        {/* Khung giấy tự co vừa chiều cao còn lại nên không phải cuộn trang để thao tác. */}
        <div className="flex min-h-[320px] min-w-0 items-center justify-center bg-slate-100 p-3" style={{ containerType: "size" }}>
          <div style={{ width: `min(100cqw, calc(100cqh * ${pageAspect}))` }}>
            <CertificateCanvas
              backgroundImage={form.backgroundImage}
              layout={form.layout}
              fieldLabel={fieldLabel}
              sampleValue={(key) => sampleValue(key, fieldLabel)}
              preview={preview}
              aspect={pageAspect}
              selection={selection}
              onSelectionChange={setSelection}
              onLayoutChange={updateLayout}
              onDropField={dropField}
              onAddTextAt={addTextAt}
              measureRef={measureRef}
              editable={canDesign}
            />
          </div>
        </div>

      </div>
    </Panel>
  );
}
