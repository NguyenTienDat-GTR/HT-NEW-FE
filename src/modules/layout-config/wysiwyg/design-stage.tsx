"use client";

import * as Popover from "@radix-ui/react-popover";
import { ArrowsOutSimple, Eye, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { clampZoom, stepZoom, type StageView } from "./stage-view";

/** Giá trị khung thiết kế cấp thêm cho khung vẽ (CertificateCanvas). */
export type StageExtras = {
  bgOpacity: number;
  guides: { x: number[]; y: number[] };
  gridStep: { x: number; y: number } | null;
  snapToGrid: boolean;
  pageMm: { w: number; h: number };
  safeMm: number;
};

const RULER = 18;

type Props = {
  aspect: number;
  pageMm: { w: number; h: number };
  view: StageView;
  onViewChange: (patch: Partial<StageView>) => void;
  /** Khung vẽ nhận các giá trị hiển thị (đường gióng, lưới, vùng an toàn...). */
  children: (extras: StageExtras) => ReactNode;
  /** Nút thêm vào thanh nổi góc dưới (cảnh báo bố cục, phím tắt...). */
  controls?: ReactNode;
};

type DragState = { axis: "x" | "y"; index: number };

// Khung chứa: thu phóng (Ctrl + lăn chuột, nút, phím Ctrl +/−/0), kéo khung bằng phím cách hoặc chuột giữa,
// thước mm, đường gióng kéo ra từ thước, lưới, vùng an toàn và độ mờ ảnh nền.
export function DesignStage({ aspect, pageMm, view, onViewChange, children, controls }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [space, setSpace] = useState(false);
  const [canvasPx, setCanvasPx] = useState({ w: 1, h: 1 });

  const ruler = view.rulers ? RULER : 0;

  // Kích thước thật của khung vẽ để vẽ vạch thước.
  useEffect(() => {
    const el = canvasBoxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setCanvasPx({ w: rect.width || 1, h: rect.height || 1 });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Ctrl + lăn chuột để thu phóng (cần listener không thụ động để chặn thu phóng của trình duyệt).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onViewChange({ zoom: clampZoom(view.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)) });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view.zoom, onViewChange]);

  // Kéo đường gióng: theo con trỏ toàn cửa sổ; thả ra ngoài trang thì xóa đường đó.
  useEffect(() => {
    if (!drag) return;
    function ratioAt(event: PointerEvent, axis: "x" | "y") {
      const rect = canvasBoxRef.current?.getBoundingClientRect();
      if (!rect) return 0.5;
      return axis === "x" ? (event.clientX - rect.left) / rect.width : (event.clientY - rect.top) / rect.height;
    }
    function onMove(event: PointerEvent) {
      const ratio = ratioAt(event, drag!.axis);
      setGuides((current) => ({ ...current, [drag!.axis]: current[drag!.axis].map((value, i) => (i === drag!.index ? ratio : value)) }));
    }
    function onUp(event: PointerEvent) {
      const ratio = ratioAt(event, drag!.axis);
      if (ratio < 0 || ratio > 1) {
        setGuides((current) => ({ ...current, [drag!.axis]: current[drag!.axis].filter((_, i) => i !== drag!.index) }));
      }
      setDrag(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  const startGuide = useCallback((axis: "x" | "y", index: number | null, event: ReactPointerEvent) => {
    event.preventDefault();
    if (index != null) {
      setDrag({ axis, index });
      return;
    }
    // Tạo đường mới tại vị trí con trỏ rồi kéo tiếp.
    const rect = canvasBoxRef.current?.getBoundingClientRect();
    const ratio = rect ? (axis === "x" ? (event.clientX - rect.left) / rect.width : (event.clientY - rect.top) / rect.height) : 0.5;
    setGuides((current) => {
      setDrag({ axis, index: current[axis].length });
      return { ...current, [axis]: [...current[axis], Math.min(1, Math.max(0, ratio))] };
    });
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    if ((event.ctrlKey || event.metaKey) && !typing) {
      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        onViewChange({ zoom: stepZoom(view.zoom, 1) });
      } else if (event.key === "-") {
        event.preventDefault();
        onViewChange({ zoom: stepZoom(view.zoom, -1) });
      } else if (event.key === "0") {
        event.preventDefault();
        onViewChange({ zoom: 1 });
      }
      return;
    }
    if (event.key === " " && !typing && !event.repeat) {
      event.preventDefault();
      setSpace(true);
    }
  }

  function startPan(event: ReactPointerEvent) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    event.preventDefault();
    panRef.current = { x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function movePan(event: ReactPointerEvent) {
    const pan = panRef.current;
    const scroller = scrollerRef.current;
    if (!pan || !scroller) return;
    scroller.scrollLeft = pan.left - (event.clientX - pan.x);
    scroller.scrollTop = pan.top - (event.clientY - pan.y);
  }

  const gridStep = view.grid || view.snapToGrid ? { x: view.gridMm / pageMm.w, y: view.gridMm / pageMm.h } : null;
  const extras: StageExtras = {
    bgOpacity: view.bgOpacity,
    guides,
    gridStep: view.grid ? gridStep : null,
    snapToGrid: view.snapToGrid,
    pageMm,
    safeMm: view.safeMm,
  };
  const cssVars = {
    "--ruler": `${ruler}px`,
    "--cw": `calc(min(100cqw - ${ruler}px, (100cqh - ${ruler}px) * ${aspect}) * ${view.zoom})`,
  } as CSSProperties;

  return (
    <div className="relative flex h-full min-h-0 flex-row" onKeyDown={handleKeyDown} onKeyUp={(event) => event.key === " " && setSpace(false)}>
      <div
        className={cn("min-h-0 min-w-0 flex-1 overflow-auto bg-slate-100 p-3", space ? "cursor-grab" : "")}
        onPointerDown={(event) => event.button === 1 && startPan(event)}
        onPointerMove={movePan}
        onPointerUp={() => (panRef.current = null)}
        ref={scrollerRef}
        style={{ containerType: "size" }}
      >
        <div className="relative mx-auto" style={{ ...cssVars, width: "calc(var(--cw) + var(--ruler))" }}>
          {view.rulers ? (
            <>
              <Ruler axis="x" guides={guides.x} lengthMm={pageMm.w} onGuide={(index, e) => startGuide("x", index, e)} px={canvasPx.w} />
              <Ruler axis="y" guides={guides.y} lengthMm={pageMm.h} onGuide={(index, e) => startGuide("y", index, e)} px={canvasPx.h} />
              <div aria-hidden className="absolute top-0 left-0 border-r border-b border-border bg-slate-200" style={{ width: RULER, height: RULER }} />
            </>
          ) : null}
          <div ref={canvasBoxRef} style={{ marginLeft: "var(--ruler)", marginTop: "var(--ruler)", width: "var(--cw)" }}>
            {children(extras)}
          </div>
        </div>
        {space ? <div aria-hidden className="absolute inset-0 z-40 cursor-grab" onPointerDown={startPan} onPointerMove={movePan} onPointerUp={() => (panRef.current = null)} /> : null}
      </div>

      {/* Thanh công cụ dọc bên phải khung: nằm ngoài vùng giấy nên không che phần đang sửa. */}
      <div aria-label="Công cụ khung thiết kế" className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-border bg-white py-2" role="toolbar">
        {controls}
        <span aria-hidden className="my-1 h-px w-7 bg-border" />
        <ViewButton label="Phóng to (Ctrl + +)" onClick={() => onViewChange({ zoom: stepZoom(view.zoom, 1) })}>
          <MagnifyingGlassPlus size={17} />
        </ViewButton>
        <button
          className="h-7 w-10 cursor-pointer rounded-md text-[11px] font-semibold tabular-nums text-foreground hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => onViewChange({ zoom: 1 })}
          title="Về mức vừa khung (Ctrl + 0)"
          type="button"
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <ViewButton label="Thu nhỏ (Ctrl + −)" onClick={() => onViewChange({ zoom: stepZoom(view.zoom, -1) })}>
          <MagnifyingGlassMinus size={17} />
        </ViewButton>
        <ViewButton label="Vừa khung" onClick={() => onViewChange({ zoom: 1 })}>
          <ArrowsOutSimple size={17} />
        </ViewButton>
        <span aria-hidden className="my-1 h-px w-7 bg-border" />
        <ViewPopover guideCount={guides.x.length + guides.y.length} onClearGuides={() => setGuides({ x: [], y: [] })} onViewChange={onViewChange} view={view} />
      </div>
    </div>
  );
}

function ViewButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-text-secondary hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function ViewPopover({ view, onViewChange, guideCount, onClearGuides }: { view: StageView; onViewChange: (patch: Partial<StageView>) => void; guideCount: number; onClearGuides: () => void }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Tùy chọn hiển thị"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-text-secondary hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          type="button"
        >
          <Eye size={17} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" className="z-50 w-[280px] space-y-3 rounded-xl border border-border bg-white p-3 text-sm shadow-[var(--shadow-card)]" collisionPadding={12} side="left" sideOffset={8}>
          <Check checked={view.rulers} label="Thước (mm) và đường gióng" onChange={(rulers) => onViewChange({ rulers })} />
          <div className="space-y-1.5">
            <Check checked={view.grid} label="Hiện lưới" onChange={(grid) => onViewChange({ grid })} />
            <Check checked={view.snapToGrid} label="Hút vào lưới khi kéo" onChange={(snapToGrid) => onViewChange({ snapToGrid })} />
            <label className="flex items-center justify-between gap-2 pl-6 text-xs text-text-secondary">
              Bước lưới (mm)
              <input
                aria-label="Bước lưới (mm)"
                className="h-8 w-16 rounded-lg border border-input px-2 text-right text-sm"
                max={50}
                min={1}
                onChange={(event) => onViewChange({ gridMm: Math.min(50, Math.max(1, Number(event.target.value) || 5)) })}
                type="number"
                value={view.gridMm}
              />
            </label>
          </div>
          <label className="flex items-center justify-between gap-2 text-sm text-foreground">
            Vùng an toàn (mm, 0 = tắt)
            <input
              aria-label="Vùng an toàn (mm)"
              className="h-8 w-16 rounded-lg border border-input px-2 text-right text-sm"
              max={30}
              min={0}
              onChange={(event) => onViewChange({ safeMm: Math.min(30, Math.max(0, Number(event.target.value) || 0)) })}
              type="number"
              value={view.safeMm}
            />
          </label>
          <label className="block text-sm text-foreground">
            <span className="flex items-center justify-between">
              Độ mờ ảnh nền khi thiết kế <span className="tabular-nums text-text-secondary">{Math.round(view.bgOpacity * 100)}%</span>
            </span>
            <input
              aria-label="Độ mờ ảnh nền"
              className="mt-1 w-full accent-[var(--primary)]"
              max={100}
              min={10}
              onChange={(event) => onViewChange({ bgOpacity: Number(event.target.value) / 100 })}
              type="range"
              value={Math.round(view.bgOpacity * 100)}
            />
            <span className="text-xs text-muted">Chỉ để nhìn rõ chữ lúc soạn, không đổi bản in.</span>
          </label>
          <button
            className="h-8 w-full cursor-pointer rounded-lg border border-input text-xs font-semibold text-foreground hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={guideCount === 0}
            onClick={onClearGuides}
            type="button"
          >
            Xóa {guideCount} đường gióng
          </button>
          <p className="text-xs leading-5 text-muted">Kéo từ thước vào trang để tạo đường gióng; kéo vạch trên thước ra ngoài để xóa. Giữ phím cách (hoặc chuột giữa) để kéo khung khi phóng to.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input checked={checked} className="h-4 w-4 accent-[var(--primary)]" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

// Chọn bước vạch thước (mm) sao cho vạch nhỏ cách nhau ≥ 6px và nhãn cách nhau ≥ 48px.
export function rulerSteps(pxPerMm: number): { minor: number; label: number } {
  const label = [5, 10, 20, 50, 100].find((s) => s * pxPerMm >= 48) ?? 100;
  const minor = [1, 2, 5, 10, 20].find((s) => s * pxPerMm >= 6 && label % s === 0) ?? label;
  return { minor, label };
}

function Ruler({ axis, lengthMm, px, guides, onGuide }: { axis: "x" | "y"; lengthMm: number; px: number; guides: number[]; onGuide: (index: number | null, event: ReactPointerEvent) => void }) {
  const horizontal = axis === "x";
  const { minor, label } = rulerSteps(px / lengthMm);
  const ticks: number[] = [];
  for (let mm = 0; mm <= lengthMm + 0.001; mm += minor) ticks.push(mm);
  const pct = (mm: number) => `${(mm / lengthMm) * 100}%`;
  return (
    <div
      className={cn("absolute z-20 cursor-crosshair bg-slate-200 text-slate-600", horizontal ? "top-0" : "left-0")}
      onPointerDown={(event) => onGuide(null, event)}
      style={horizontal ? { left: RULER, right: 0, height: RULER } : { top: RULER, bottom: 0, width: RULER }}
      title={horizontal ? "Kéo xuống để tạo đường gióng ngang" : "Kéo sang phải để tạo đường gióng dọc"}
    >
      <svg aria-hidden className="h-full w-full overflow-visible" role="presentation">
        {ticks.map((mm) => {
          const major = Math.abs(mm % label) < 0.001;
          const start = major ? 0 : RULER * 0.55;
          return horizontal ? (
            <g key={mm}>
              <line stroke="#64748b" strokeWidth={1} x1={pct(mm)} x2={pct(mm)} y1={start} y2={RULER} />
              {major ? (
                <text fill="#475569" fontSize={9} x={pct(mm)} y={9} dx={2}>
                  {mm}
                </text>
              ) : null}
            </g>
          ) : (
            <g key={mm}>
              <line stroke="#64748b" strokeWidth={1} x1={start} x2={RULER} y1={pct(mm)} y2={pct(mm)} />
              {major ? (
                <text fill="#475569" fontSize={9} transform={`rotate(-90 9 ${pct(mm)})`} x={9} y={pct(mm)} dx={-2} textAnchor="end">
                  {mm}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {guides.map((ratio, index) => (
        <div
          aria-label="Đường gióng"
          className="absolute h-2.5 w-2.5 cursor-pointer rounded-sm bg-fuchsia-500 ring-1 ring-white"
          key={index}
          onPointerDown={(event) => {
            event.stopPropagation();
            onGuide(index, event);
          }}
          role="presentation"
          style={horizontal ? { left: `calc(${ratio * 100}% - 5px)`, bottom: 0 } : { top: `calc(${ratio * 100}% - 5px)`, right: 0 }}
          title="Kéo để dời, kéo ra ngoài trang để xóa"
        />
      ))}
    </div>
  );
}
