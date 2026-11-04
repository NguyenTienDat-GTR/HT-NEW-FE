"use client";

import { mediaSrc } from "@/lib/media/media-url";
import { cn } from "@/lib/utils";
import { copyToClipboard, duplicateItems, nudgeItems, readClipboard, removeItems, reorderItems, selectAllIndexes, type BoxOf } from "@/modules/layout-config/wysiwyg/layout-ops";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MutableRefObject } from "react";
import Moveable from "react-moveable";
import Selecto from "react-selecto";
import {
  DEFAULT_PHOTO_SIZE,
  DEFAULT_QR_SIZE,
  MAX_PHOTO_SIZE,
  MAX_PHOTO_WIDTH,
  MAX_QR_SIZE,
  MIN_PHOTO_SIZE,
  MIN_PHOTO_WIDTH,
  MIN_QR_SIZE,
  clamp,
  fontStack,
  photoAspect,
  type LayoutItem,
} from "./certificate-design";
import { MAX_FONT_RATIO, MIN_FONT_RATIO } from "@/modules/layout-config/wysiwyg/font-size";

export type LayoutUpdater = (layout: LayoutItem[]) => LayoutItem[];

/** Kiểu dữ liệu kéo từ danh sách trường thả lên khung thiết kế. */
export const FIELD_DRAG_TYPE = "application/x-layout-field";

type Props = {
  backgroundImage: string;
  layout: LayoutItem[];
  fieldLabel: (key?: string) => string;
  sampleValue: (key?: string) => string;
  preview: boolean;
  aspect: number;
  editable: boolean;
  /** Các phần tử đang chọn (chọn nhiều bằng kéo vùng hoặc Shift + click). */
  selection?: number[];
  onSelectionChange?: (indexes: number[]) => void;
  /** Mọi thay đổi bố cục từ khung (kéo, đổi cỡ, gõ chữ, phím tắt). `key` gộp các thay đổi liên tiếp thành một bước hoàn tác. */
  onLayoutChange?: (updater: LayoutUpdater, key?: string) => void;
  /** Thả một trường từ danh sách vào khung; x, y theo tỉ lệ 0..1. */
  onDropField?: (fieldKey: string, x: number, y: number) => void;
  /** Nhấp đúp vào chỗ trống để thêm văn bản tại đó. */
  onAddTextAt?: (x: number, y: number) => void;
  /** Khung gán hàm đo hộp bao thật của phần tử (dùng cho căn lề). */
  measureRef?: MutableRefObject<BoxOf | null>;
  /** Độ mờ ảnh nền chỉ khi thiết kế (0..1), giúp nhìn rõ chữ khi nền rối; không ảnh hưởng bản in. */
  bgOpacity?: number;
  /** Đường gióng do người dùng kéo ra từ thước (tỉ lệ 0..1 của trang). */
  guides?: { x: number[]; y: number[] };
  /** Bước lưới (tỉ lệ 0..1): vẽ lưới mờ và, khi snapToGrid, hút phần tử vào lưới. */
  gridStep?: { x: number; y: number } | null;
  snapToGrid?: boolean;
  /** Kích thước trang (mm) để hiện tọa độ và vùng an toàn. */
  pageMm?: { w: number; h: number };
  /** Vùng an toàn (mm) vẽ viền nét đứt. */
  safeMm?: number;
  /** Báo kích thước thật của ảnh nền (kiểm tra độ phân giải). */
  onBackgroundInfo?: (info: { naturalWidth: number; naturalHeight: number } | null) => void;
};

type Start = { x: number; y: number; fontSize: number; size?: number; photoWidth?: number; free: boolean };

// Khung thiết kế chứng nhận / thẻ: kéo, đổi cỡ bằng tay cầm, chọn nhiều, sửa chữ tại chỗ, thả trường từ danh sách.
export function CertificateCanvas({
  backgroundImage,
  layout,
  fieldLabel,
  sampleValue: sample,
  preview,
  aspect,
  editable,
  selection = [],
  onSelectionChange,
  onLayoutChange,
  onDropField,
  onAddTextAt,
  measureRef,
  bgOpacity = 1,
  guides,
  gridStep,
  snapToGrid,
  pageMm,
  safeMm,
  onBackgroundInfo,
}: Props) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startRef = useRef<Map<number, Start>>(new Map());
  const [targets, setTargets] = useState<HTMLDivElement[]>([]);
  const [snapEls, setSnapEls] = useState<HTMLDivElement[]>([]);
  const [stageDims, setStageDims] = useState({ width: 1, height: 1 });
  const [editing, setEditing] = useState<number | null>(null);
  const [dropOver, setDropOver] = useState(false);

  const active = editable && !preview && Boolean(onLayoutChange);
  const selectionKey = selection.join(",");

  // Gắn các phần tử DOM của phần tử đang chọn làm đích cho tay cầm.
  useLayoutEffect(() => {
    const els = selection.map((index) => itemRefs.current[index]).filter((el): el is HTMLDivElement => Boolean(el));

    setTargets(els);
    setSnapEls(itemRefs.current.filter((el, index): el is HTMLDivElement => Boolean(el) && !selection.includes(index)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, layout.length, active]);

  // Bố cục đổi (kể cả do React vẽ lại sau khi kéo): cập nhật khung tay cầm.
  useLayoutEffect(() => {
    moveableRef.current?.updateRect();
  }, [layout, aspect]);

  // Theo dõi kích thước khung để đặt đường hút giữa trang.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const rect = stage.getBoundingClientRect();
      setStageDims({ width: rect.width || 1, height: rect.height || 1 });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Cho thanh công cụ đo hộp bao thật (tỉ lệ 0..1) của từng phần tử.
  useEffect(() => {
    if (!measureRef) return;
    measureRef.current = (item, index) => {
      const el = itemRefs.current[index];
      const stage = stageRef.current;
      if (!el || !stage) return { left: item.x, right: item.x, top: item.y, bottom: item.y };
      const rect = el.getBoundingClientRect();
      const base = stage.getBoundingClientRect();
      return {
        left: (rect.left - base.left) / base.width,
        right: (rect.right - base.left) / base.width,
        top: (rect.top - base.top) / base.height,
        bottom: (rect.bottom - base.top) / base.height,
      };
    };
    return () => {
      measureRef.current = null;
    };
  }, [measureRef]);

  const stageSize = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    return { width: rect?.width || 1, height: rect?.height || 1 };
  }, []);

  function indexOf(el: Element | null | undefined): number {
    const raw = (el as HTMLElement | null)?.dataset?.idx;
    return raw == null ? -1 : Number(raw);
  }

  function beginChange(indexes: number[]) {
    const map = new Map<number, Start>();
    for (const index of indexes) {
      const item = layout[index];
      if (!item) continue;
      map.set(index, { x: item.x, y: item.y, fontSize: item.fontSize, size: item.size, photoWidth: item.photoWidth, free: item.photoRatio === "free" });
    }
    startRef.current = map;
  }

  function applyDrag(distX: number, distY: number) {
    const { width, height } = stageSize();
    const dx = distX / width;
    const dy = distY / height;
    const starts = startRef.current;
    onLayoutChange?.(
      (current) =>
        current.map((item, index) => {
          const start = starts.get(index);
          return start ? { ...item, x: clamp(start.x + dx, 0, 1), y: clamp(start.y + dy, 0, 1) } : item;
        }),
      `move:${[...starts.keys()].join(",")}`,
    );
  }

  function applyScale(index: number, scaleX: number, scaleY: number) {
    const start = startRef.current.get(index);
    if (!start) return;
    onLayoutChange?.(
      (current) =>
        current.map((item, idx) => {
          if (idx !== index) return item;
          if (item.type === "QR") {
            return { ...item, size: clamp((start.size ?? DEFAULT_QR_SIZE) * scaleX, MIN_QR_SIZE, MAX_QR_SIZE) };
          }
          if (item.type === "PHOTO") {
            if (start.free) {
              return {
                ...item,
                size: clamp((start.size ?? DEFAULT_PHOTO_SIZE) * scaleY, MIN_PHOTO_SIZE, MAX_PHOTO_SIZE),
                photoWidth: clamp((start.photoWidth ?? (start.size ?? DEFAULT_PHOTO_SIZE) * 0.66) * scaleX, MIN_PHOTO_WIDTH, MAX_PHOTO_WIDTH),
              };
            }
            return { ...item, size: clamp((start.size ?? DEFAULT_PHOTO_SIZE) * scaleX, MIN_PHOTO_SIZE, MAX_PHOTO_SIZE) };
          }
          return { ...item, fontSize: clamp(start.fontSize * scaleX, MIN_FONT_RATIO, MAX_FONT_RATIO) };
        }),
      `scale:${index}`,
    );
  }

  function commitText(index: number, text: string) {
    setEditing(null);
    const current = layout[index];
    if (!current || current.type !== "TEXT" || (current.text ?? "") === text) return;
    onLayoutChange?.((items) => items.map((item, idx) => (idx === index ? { ...item, text } : item)), `text:${index}`);
  }

  // Nhấp vào phần tử chưa được chọn thì chọn nó (Shift + nhấp do Selecto xử lý).
  // Phần tử đã chọn giữ nguyên để không phá vùng chọn nhóm sau khi kéo.
  function pick(event: React.MouseEvent, index: number) {
    if (!active || editing != null || event.shiftKey || selection.includes(index)) return;
    onSelectionChange?.([index]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!active || editing != null) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && key === "a") {
      event.preventDefault();
      onSelectionChange?.(selectAllIndexes(layout));
      return;
    }
    if (mod && key === "c" && selection.length > 0) {
      event.preventDefault();
      copyToClipboard(selection.map((i) => layout[i]).filter(Boolean));
      return;
    }
    if (mod && key === "v") {
      const pasted = readClipboard();
      if (pasted.length === 0) return;
      event.preventDefault();
      const start = layout.length;
      onLayoutChange?.((items) => [...items, ...pasted]);
      onSelectionChange?.(pasted.map((_, n) => start + n));
      return;
    }
    if (selection.length === 0) return;
    if (mod && (event.key === "]" || event.key === "[")) {
      event.preventDefault();
      const result = reorderItems(layout, selection, event.key === "]" ? "forward" : "backward");
      onLayoutChange?.(() => result.layout);
      onSelectionChange?.(result.selection);
      return;
    }
    if (selection.some((i) => layout[i]?.locked) && (event.key.startsWith("Arrow") || event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      return;
    }
    const step = event.shiftKey ? 0.01 : 0.002;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const arrow = arrows[event.key];
    if (arrow) {
      event.preventDefault();
      onLayoutChange?.((items) => nudgeItems(items, selection, arrow[0], arrow[1]), `nudge:${selectionKey}`);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onLayoutChange?.((items) => removeItems(items, selection));
      onSelectionChange?.([]);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      const { created } = duplicateItems(layout, selection);
      onLayoutChange?.((items) => duplicateItems(items, selection).layout);
      onSelectionChange?.(created);
      return;
    }
    if (event.key === "Escape") onSelectionChange?.([]);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!active || !onDropField || !event.dataTransfer.types.includes(FIELD_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropOver(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    setDropOver(false);
    const fieldKey = event.dataTransfer.getData(FIELD_DRAG_TYPE);
    if (!active || !onDropField || !fieldKey) return;
    event.preventDefault();
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    onDropField(fieldKey, clamp((event.clientX - rect.left) / rect.width, 0, 1), clamp((event.clientY - rect.top) / rect.height, 0, 1));
  }

  function handleDoubleClickStage(event: React.MouseEvent<HTMLDivElement>) {
    if (!active || !onAddTextAt || (event.target as HTMLElement).closest("[data-idx]")) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    onAddTextAt(clamp((event.clientX - rect.left) / rect.width, 0, 1), clamp((event.clientY - rect.top) / rect.height, 0, 1));
  }

  const single = selection.length === 1 && targets.length === 1 ? selection[0] : null;
  const singleItem = single != null ? layout[single] : null;
  const keepRatio = !(singleItem?.type === "PHOTO" && singleItem.photoRatio === "free");
  const selectedSet = new Set(selection);
  const lockedSelected = selection.some((i) => layout[i]?.locked);
  const selectedForReadout = selection.length === 1 ? layout[selection[0]] : null;

  // Đường hút: mép / tâm trang, đường gióng người dùng kéo ra, và (nếu bật) các điểm của lưới.
  const verticalLines = [0, stageDims.width / 2, stageDims.width, ...(guides?.x ?? []).map((r) => r * stageDims.width)];
  const horizontalLines = [0, stageDims.height / 2, stageDims.height, ...(guides?.y ?? []).map((r) => r * stageDims.height)];
  if (gridStep && snapToGrid && gridStep.x > 0 && gridStep.y > 0) {
    for (let x = gridStep.x; x < 1; x += gridStep.x) verticalLines.push(x * stageDims.width);
    for (let y = gridStep.y; y < 1; y += gridStep.y) horizontalLines.push(y * stageDims.height);
  }

  return (
    <div
      ref={setContainer}
      className={cn("relative w-full select-none outline-none", dropOver ? "ring-2 ring-primary" : "")}
      onDragLeave={() => setDropOver(false)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      style={{ aspectRatio: `${aspect}` }}
      tabIndex={active ? 0 : -1}
    >
      <div
        ref={stageRef}
        className="absolute inset-0 overflow-hidden rounded-lg border border-border bg-surface-2"
        onDoubleClick={handleDoubleClickStage}
        style={{ containerType: "size" }}
      >
        {backgroundImage ? (
          // Stretch đầy khung để khớp PDF (ảnh nền được vẽ full trang). Nên dùng ảnh đúng tỉ lệ khổ giấy.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Ảnh nền chứng nhận"
            className="absolute inset-0 h-full w-full object-fill"
            decoding="async"
            draggable={false}
            loading="lazy"
            onLoad={(event) => onBackgroundInfo?.({ naturalWidth: event.currentTarget.naturalWidth, naturalHeight: event.currentTarget.naturalHeight })}
            src={mediaSrc(backgroundImage)}
            style={{ opacity: preview ? 1 : bgOpacity }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Chưa có ảnh nền</div>
        )}
        {active && gridStep && gridStep.x > 0 && gridStep.y > 0 ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(59,130,246,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.22) 1px, transparent 1px)",
              backgroundSize: `${gridStep.x * 100}% ${gridStep.y * 100}%`,
            }}
          />
        ) : null}
        {guides?.x.map((ratio, i) => (
          <div aria-hidden className="pointer-events-none absolute top-0 bottom-0 w-px bg-fuchsia-500/80" key={`gx-${i}`} style={{ left: `${ratio * 100}%` }} />
        ))}
        {guides?.y.map((ratio, i) => (
          <div aria-hidden className="pointer-events-none absolute right-0 left-0 h-px bg-fuchsia-500/80" key={`gy-${i}`} style={{ top: `${ratio * 100}%` }} />
        ))}
        {active && safeMm && safeMm > 0 && pageMm ? (
          <div
            aria-hidden
            className="pointer-events-none absolute border border-dashed border-emerald-500/80"
            style={{ left: `${(safeMm / pageMm.w) * 100}%`, right: `${(safeMm / pageMm.w) * 100}%`, top: `${(safeMm / pageMm.h) * 100}%`, bottom: `${(safeMm / pageMm.h) * 100}%` }}
          />
        ) : null}
        {layout.map((item, index) => {
          if (item.hidden && (preview || !editable)) return null;
          const setRef = (el: HTMLDivElement | null) => {
            itemRefs.current[index] = el;
          };
          const selectedNow = !preview && selectedSet.has(index);
          if (item.type === "PHOTO") {
            const photoHeight = item.size ?? DEFAULT_PHOTO_SIZE;
            return (
              <div
                data-idx={index}
                ref={setRef}
                onClick={(event) => pick(event, index)}
                key={index}
                className={cn(item.hidden ? "pointer-events-none opacity-30" : "wysiwyg-item", "absolute flex items-center justify-center bg-slate-100 text-[10px] font-semibold text-slate-500", active ? "cursor-move" : "cursor-default")}
                style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${photoHeight * photoAspect(item) * 100}cqh`, height: `${photoHeight * 100}cqh`, transform: "translate(-50%, -50%)" }}
              >
                <div className="pointer-events-none h-full w-full overflow-hidden">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Ảnh huynh trưởng" decoding="async" loading="lazy" className="h-full w-full object-cover" draggable={false} src={mediaSrc(item.image)} />
                  ) : (
                    <PhotoPlaceholder />
                  )}
                </div>
                {selectedNow && !active ? <span className="pointer-events-none absolute inset-0 outline-dashed outline-2 outline-primary" /> : null}
              </div>
            );
          }
          if (item.type === "QR") {
            const side = `${(item.size ?? DEFAULT_QR_SIZE) * 100}cqh`;
            return (
              <div
                data-idx={index}
                ref={setRef}
                onClick={(event) => pick(event, index)}
                key={index}
                className={cn(item.hidden ? "pointer-events-none opacity-30" : "wysiwyg-item", "absolute flex items-center justify-center bg-white text-[10px] font-semibold text-slate-700", active ? "cursor-move" : "cursor-default")}
                style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: side, height: side, transform: "translate(-50%, -50%)" }}
              >
                <div className="pointer-events-none h-full w-full">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Mã QR chứng nhận" decoding="async" loading="lazy" className="h-full w-full" draggable={false} src={item.image} />
                  ) : (
                    <QrPlaceholder />
                  )}
                </div>
              </div>
            );
          }
          const label = item.type === "TEXT" ? item.text ?? "" : preview ? sample(item.fieldKey) : `[${fieldLabel(item.fieldKey)}]`;
          const translate = item.align === "center" ? "-50%" : item.align === "right" ? "-100%" : "0";
          const isEditing = editing === index;
          return (
            <div
              data-idx={index}
              key={index}
              className={cn(item.hidden ? "pointer-events-none opacity-30" : "wysiwyg-item", "absolute max-w-[90%] whitespace-nowrap px-1 leading-tight", active ? (isEditing ? "cursor-text" : "cursor-move") : "cursor-default", isEditing ? "outline-dashed outline-2 outline-primary" : "")}
              contentEditable={isEditing}
              onClick={(event) => pick(event, index)}
              onBlur={isEditing ? (event) => commitText(index, event.currentTarget.innerText.replace(/\n/g, " ")) : undefined}
              onDoubleClick={() => {
                if (active && item.type === "TEXT") setEditing(index);
              }}
              onKeyDown={
                isEditing
                  ? (event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      } else if (event.key === "Escape") {
                        event.currentTarget.innerText = item.text ?? "";
                        event.currentTarget.blur();
                      }
                    }
                  : undefined
              }
              ref={(el) => {
                setRef(el);
                if (el && isEditing && document.activeElement !== el) {
                  el.focus();
                  const range = document.createRange();
                  range.selectNodeContents(el);
                  const selectionApi = window.getSelection();
                  selectionApi?.removeAllRanges();
                  selectionApi?.addRange(range);
                }
              }}
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                transform: `translate(${translate}, -50%)`,
                fontSize: `max(4px, ${item.fontSize * 100}cqh)`,
                color: item.color,
                fontFamily: fontStack(item.fontFamily),
                fontWeight: item.bold ? 700 : 400,
                fontStyle: item.italic ? "italic" : "normal",
                textDecoration: item.underline ? "underline" : "none",
              }}
              suppressContentEditableWarning
            >
              {isEditing ? (item.text ?? "") : label}
            </div>
          );
        })}
      </div>

      {active && container ? (
        <>
          <Moveable
            ref={moveableRef}
            container={container}
            target={editing != null ? [] : targets}
            origin={false}
            // Kéo
            draggable={!lockedSelected}
            throttleDrag={0}
            onDragStart={() => beginChange(selection)}
            onDrag={(event) => applyDrag(event.dist[0], event.dist[1])}
            onDragGroupStart={() => beginChange(selection)}
            onDragGroup={(event) => applyDrag(event.dist[0], event.dist[1])}
            // Đổi cỡ (chỉ khi chọn một phần tử): chữ đổi cỡ chữ, QR / ảnh đổi kích thước
            scalable={single != null && !lockedSelected}
            keepRatio={keepRatio}
            renderDirections={single != null ? ["nw", "ne", "sw", "se"] : []}
            throttleScale={0.01}
            onScaleStart={(event) => {
              event.set([1, 1]);
              if (single != null) beginChange([single]);
            }}
            onScale={(event) => {
              if (single != null) applyScale(single, event.scale[0], event.scale[1]);
            }}
            // Hút vào mép / tâm khung và các phần tử khác
            snappable
            snapContainer={stageRef}
            elementGuidelines={snapEls}
            verticalGuidelines={verticalLines}
            horizontalGuidelines={horizontalLines}
            snapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
            elementSnapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
            snapThreshold={6}
            isDisplaySnapDigit={false}
          />
          <Selecto
            container={container}
            dragContainer={container}
            selectableTargets={[".wysiwyg-item"]}
            hitRate={0}
            selectByClick
            selectFromInside={false}
            toggleContinueSelect={["shift"]}
            ratio={0}
            onDragStart={(event) => {
              const input = event.inputEvent.target as HTMLElement;
              if (editing != null) {
                event.stop();
                return;
              }
              if (moveableRef.current?.isMoveableElement(input) || targets.some((el) => el === input || el.contains(input))) event.stop();
              container.focus({ preventScroll: true });
            }}
            onSelectEnd={(event) => {
              const indexes = event.selected.map((el) => indexOf(el)).filter((i) => i >= 0);
              onSelectionChange?.(indexes);
              if (event.isDragStart) {
                event.inputEvent.preventDefault();
                setTimeout(() => moveableRef.current?.dragStart(event.inputEvent));
              }
            }}
          />
        </>
      ) : null}
      {active && selectedForReadout && pageMm ? (
        <div
          aria-live="off"
          className="pointer-events-none absolute bottom-1.5 left-1.5 z-10 rounded bg-slate-900/80 px-1.5 py-0.5 text-[11px] tabular-nums text-white"
        >
          X {(selectedForReadout.x * pageMm.w).toFixed(1)} · Y {(selectedForReadout.y * pageMm.h).toFixed(1)} mm
        </div>
      ) : null}
    </div>
  );
}

// Hình giữ chỗ ảnh huynh trưởng trong trình soạn (ảnh thật lấy từ hồ sơ khi xuất / xem trước chứng nhận hoặc thẻ).
function PhotoPlaceholder() {
  return (
    <svg aria-label="Ảnh huynh trưởng (xem trước)" className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 24 24">
      <rect width="24" height="24" fill="#e2e8f0" />
      <circle cx="12" cy="9.5" r="4" fill="#94a3b8" />
      <path d="M3.5 24c0-5 3.8-8.5 8.5-8.5s8.5 3.5 8.5 8.5z" fill="#94a3b8" />
    </svg>
  );
}

// Hình giữ chỗ mã QR trong trình soạn (mã thật chỉ sinh khi xuất PDF).
function QrPlaceholder() {
  return (
    <svg aria-label="Mã QR (xem trước)" className="h-full w-full p-[6%]" viewBox="0 0 21 21" shapeRendering="crispEdges">
      <rect width="21" height="21" fill="#fff" />
      {[[0, 0], [14, 0], [0, 14]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#111" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#111" />
        </g>
      ))}
      {[[9, 1], [11, 3], [9, 5], [8, 9], [10, 10], [12, 9], [14, 11], [16, 10], [18, 12], [9, 13], [11, 15], [13, 14], [15, 16], [17, 18], [9, 18], [12, 19], [19, 9], [16, 14]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" fill="#111" />
      ))}
    </svg>
  );
}
