"use client";

import { BackgroundAlbumDialog } from "@/components/common/background-album-dialog";
import { ArrowClockwise, ArrowCounterClockwise, ClockCounterClockwise, CursorClick, Eye, PencilSimple, Plus, QrCode, TextB, TextItalic, TextT, TextUnderline, Trash, Images, UserCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PhotoInspector } from "./photo-inspector";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Tip } from "@/components/ui/tip";
import type {  } from "@/config/routes/routes";
import { cn } from "@/lib/utils";
import { useUndoHistory } from "../undo-history";
import { CertificateCanvas, FONT_OPTIONS, PAPER_OPTIONS, clamp, DEFAULT_QR_SIZE, MAX_NAME_LENGTH, MAX_QR_SIZE, MIN_QR_SIZE, paperAspect, sampleValue, type ConfigResponse, type DesignForm, type FieldCatalogItem, type FontFamily, type LayoutItem } from "./certificate-design";
import { Field, SELECT_CLASS, StyleToggle } from "@/modules/layout-config/form-controls";

export function CertificateDesignerPanel({
  addField,
  addFieldKey,
  addPhoto,
  addQr,
  addText,
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
  removeItem,
  restoreSaved,
  selected,
  selectedConfig,
  selectedIndex,
  setAddFieldKey,
  setAlbumOpen,
  setPreview,
  setSelectedIndex,
  undo,
  updateForm,
  updateItem,
}: {
  addField: () => void;
  addFieldKey: string;
  addPhoto: () => void;
  addQr: () => void;
  addText: () => void;
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
  removeItem: (index: number) => void;
  restoreSaved: () => void;
  selected: LayoutItem | null;
  selectedConfig: ConfigResponse | null;
  selectedIndex: number | null;
  setAddFieldKey: (key: string) => void;
  setAlbumOpen: (open: boolean) => void;
  setPreview: (preview: boolean) => void;
  setSelectedIndex: (index: number | null) => void;
  undo: () => void;
  updateForm: (patch: Partial<DesignForm>, key?: string) => void;
  updateItem: (index: number, patch: Partial<LayoutItem>, key?: string) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-[240px] max-w-md flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <label className="text-[13px] font-medium text-text-secondary" htmlFor="certificate-config-name">
              Tên cấu hình
            </label>
            <HelpTip label="Hướng dẫn tên cấu hình">
              Trùng tên sẽ tự thêm hậu tố (1), (2)… Người ký được chọn khi <span className="font-semibold">duyệt từng chứng nhận</span> và ghi trực tiếp vào chứng nhận đó; khi xuất PDF sẽ dùng người ký của chính chứng nhận.
            </HelpTip>
            {dirty ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--badge-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--badge-warning-fg)]">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
                Chưa lưu
              </span>
            ) : null}
          </div>
          <Input
            disabled={!canEditCurrent}
            id="certificate-config-name"
            maxLength={MAX_NAME_LENGTH + 20}
            onChange={(event) => updateForm({ name: event.target.value }, "name")}
            placeholder="Ví dụ: Mẫu huynh trưởng cấp I"
            value={form.name}
          />
          {nameTooLong ? (
            <p className="mt-1 text-xs text-danger" role="alert">
              Tên tối đa {MAX_NAME_LENGTH} ký tự.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <Button aria-label="Hoàn tác" disabled={!canEditCurrent || !history.canUndo} onClick={undo} size="icon" title="Hoàn tác (Ctrl+Z)" type="button" variant="icon">
            <ArrowCounterClockwise size={18} />
          </Button>
          <Button aria-label="Làm lại" disabled={!canEditCurrent || !history.canRedo} onClick={redo} size="icon" title="Làm lại (Ctrl+Y)" type="button" variant="icon">
            <ArrowClockwise size={18} />
          </Button>
          <Button disabled={!canEditCurrent || !dirty} onClick={restoreSaved} type="button" variant="outline">
            <ClockCounterClockwise size={18} /> {isNew ? "Làm mới" : "Khôi phục bản đã lưu"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-border bg-slate-50 px-4 py-2.5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Khổ giấy">
            <select
              className={SELECT_CLASS}
              disabled={!canEditCurrent}
              value={form.paperSize}
              onChange={(event) => updateForm({ paperSize: event.target.value })}
            >
              {PAPER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Hướng in">
            <select
              className={SELECT_CLASS}
              disabled={!canEditCurrent}
              value={form.orientation}
              onChange={(event) => updateForm({ orientation: event.target.value })}
            >
              <option value="LANDSCAPE">Ngang</option>
              <option value="PORTRAIT">Dọc</option>
            </select>
          </Field>
          <Button disabled={!canEditCurrent} onClick={() => setAlbumOpen(true)} type="button" variant="outline">
            <Images size={16} />
            {form.backgroundImage ? "Đổi ảnh nền (album)" : "Chọn ảnh nền (album)"}
          </Button>
          <BackgroundAlbumDialog
            currentAssetId={form.backgroundAssetId || null}
            kind="CERTIFICATE"
            onOpenChange={setAlbumOpen}
            onPick={(item) => updateForm({ backgroundImage: item.url, backgroundAssetId: item.assetId })}
            open={albumOpen}
          />
        </div>

        {canEditCurrent ? (
          <>
            <span aria-hidden className="hidden h-8 w-px bg-border lg:block" />
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Thêm phần tử">
                <select className={cn(SELECT_CLASS, "min-w-[200px]")} value={addFieldKey} onChange={(event) => setAddFieldKey(event.target.value)}>
                  <option value="">— Chọn trường dữ liệu —</option>
                  {(fieldsQuery.data ?? []).map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.group} · {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Button disabled={!addFieldKey} onClick={addField} type="button" variant="outline">
                <Plus size={16} /> Thêm trường
              </Button>
              <Button onClick={addText} type="button" variant="outline">
                <TextT size={16} /> Văn bản
              </Button>
              <Tip label="Thêm ảnh đại diện của huynh trưởng nhận chứng nhận. Ảnh lấy từ hồ sơ huynh trưởng khi xuất PDF; huynh trưởng chưa có ảnh thì không in gì.">
                <Button onClick={addPhoto} type="button" variant="outline">
                  <UserCircle size={16} /> Ảnh huynh trưởng
                </Button>
              </Tip>
              <Tip label="Thêm mã QR chứa mã chứng nhận. Chỉ khi bố cục có mã QR thì khi xuất PDF hệ thống mới tạo mã QR (không lưu lại).">
                <Button onClick={addQr} type="button" variant="outline">
                  <QrCode size={16} /> Mã QR
                </Button>
              </Tip>
            </div>
            <span className="ml-auto hidden text-xs text-muted xl:block">Ctrl+Z hoàn tác · Ctrl+Y làm lại</span>
          </>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="bg-slate-100 p-3 sm:p-4">
          <CertificateCanvas
            backgroundImage={form.backgroundImage}
            layout={form.layout}
            fieldLabel={fieldLabel}
            sampleValue={(key) => sampleValue(key, fieldLabel)}
            preview={preview}
            aspect={paperAspect(form.paperSize, form.orientation)}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onMove={(index, x, y) => updateItem(index, { x, y }, "move")}
            onResizePhoto={(index, patch) => updateItem(index, patch, "photoResize")}
            editable={canEditCurrent && !preview}
          />
        </div>

        <aside aria-label="Thuộc tính phần tử" className="space-y-4 border-t border-border bg-white p-4 lg:border-l lg:border-t-0">
          {selected && selectedIndex != null ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Phần tử đang chọn</p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selected.type === "TEXT" ? "Văn bản tĩnh" : selected.type === "QR" ? "Mã QR chứng nhận" : selected.type === "PHOTO" ? "Ảnh huynh trưởng" : fieldLabel(selected.fieldKey)}
                  </p>
                </div>
                <Button aria-label="Xóa phần tử" className="text-danger" disabled={!canEditCurrent} onClick={() => removeItem(selectedIndex)} size="icon" title="Xóa phần tử" type="button" variant="ghost">
                  <Trash size={18} />
                </Button>
              </div>

              {selected.type === "QR" ? (
                <div className="space-y-2">
                  <Field label="Kích thước mã QR (% chiều cao giấy)" hint="Mã QR chứa mã chứng nhận. Kéo để đặt vị trí (điểm kéo là tâm mã). Nên để đủ lớn và tương phản với nền để dễ quét.">
                    <Input
                      disabled={!canEditCurrent}
                      max={Math.round(MAX_QR_SIZE * 100)}
                      min={Math.round(MIN_QR_SIZE * 100)}
                      onChange={(event) => updateItem(selectedIndex, { size: clamp(Number(event.target.value) / 100, MIN_QR_SIZE, MAX_QR_SIZE) }, "qrSize")}
                      type="number"
                      value={Math.round((selected.size ?? DEFAULT_QR_SIZE) * 100)}
                    />
                  </Field>
                </div>
              ) : null}

              {selected.type === "PHOTO" ? (
                <PhotoInspector disabled={!canEditCurrent} item={selected} onChange={(patch, key) => updateItem(selectedIndex, patch, key)} unit="giấy" />
              ) : null}

              {selected.type === "TEXT" ? (
                <Field label="Nội dung">
                  <Input disabled={!canEditCurrent} onChange={(event) => updateItem(selectedIndex, { text: event.target.value }, "text")} value={selected.text ?? ""} />
                </Field>
              ) : null}

              {selected.type === "QR" || selected.type === "PHOTO" ? null : (
                <>
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Kiểu chữ</p>
                    <Field label="Phông chữ">
                      <select
                        className={cn(SELECT_CLASS, "w-full")}
                        disabled={!canEditCurrent}
                        onChange={(event) => updateItem(selectedIndex, { fontFamily: event.target.value as FontFamily })}
                        value={selected.fontFamily}
                      >
                        {FONT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Cỡ chữ (%)">
                        <Input
                          disabled={!canEditCurrent}
                          max={30}
                          min={1}
                          onChange={(event) => updateItem(selectedIndex, { fontSize: clamp(Number(event.target.value) / 100, 0.005, 0.3) }, "fontSize")}
                          type="number"
                          value={Math.round(selected.fontSize * 100)}
                        />
                      </Field>
                      <Field label="Màu chữ">
                        <input
                          aria-label="Màu chữ"
                          className="h-10 w-full cursor-pointer rounded-lg border border-input bg-white p-1 disabled:cursor-not-allowed"
                          disabled={!canEditCurrent}
                          onChange={(event) => updateItem(selectedIndex, { color: event.target.value }, "color")}
                          type="color"
                          value={selected.color}
                        />
                      </Field>
                    </div>
                    <Field label="Canh lề">
                      <div aria-label="Canh lề" className="inline-flex w-full rounded-lg bg-surface-2 p-1" role="group">
                        {(
                          [
                            ["left", "Trái"],
                            ["center", "Giữa"],
                            ["right", "Phải"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            aria-pressed={selected.align === value}
                            className={cn(
                              "h-8 flex-1 cursor-pointer rounded-md text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                              selected.align === value ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
                            )}
                            disabled={!canEditCurrent}
                            key={value}
                            onClick={() => updateItem(selectedIndex, { align: value as LayoutItem["align"] })}
                            type="button"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <div className="flex gap-2">
                      <StyleToggle active={selected.bold} disabled={!canEditCurrent} label="In đậm" onClick={() => updateItem(selectedIndex, { bold: !selected.bold })}>
                        <TextB size={16} weight="bold" />
                      </StyleToggle>
                      <StyleToggle active={selected.italic} disabled={!canEditCurrent} label="In nghiêng" onClick={() => updateItem(selectedIndex, { italic: !selected.italic })}>
                        <TextItalic size={16} />
                      </StyleToggle>
                      <StyleToggle active={selected.underline} disabled={!canEditCurrent} label="Gạch chân" onClick={() => updateItem(selectedIndex, { underline: !selected.underline })}>
                        <TextUnderline size={16} />
                      </StyleToggle>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-center">
              <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-white text-primary shadow-sm">
                <CursorClick size={20} />
              </span>
              <p className="text-sm font-semibold text-foreground">Chưa chọn phần tử</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Chọn một phần tử trên ảnh để chỉnh nội dung, cỡ chữ, màu và vị trí. Kéo phần tử để đổi vị trí.</p>
            </div>
          )}

          {selectedConfig ? (
            <div className="rounded-xl border border-border bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-foreground">Loại khóa đang dùng ({selectedConfig.usedByCount})</p>
              {selectedConfig.usedByCount > 0 ? (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] text-text-secondary">
                  {selectedConfig.usedByCourseTypes.map((type) => (
                    <li key={type.typeCode}>{type.typeName || type.typeCode}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[13px] text-text-secondary">Chưa có loại khóa nào dùng cấu hình này. Gán trong form của từng loại khóa.</p>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </Panel>
  );
}
