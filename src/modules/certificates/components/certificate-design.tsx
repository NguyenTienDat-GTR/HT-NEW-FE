"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Nạp phông chữ (có dấu tiếng Việt) để xem trước khớp PDF; PDF dùng font nhúng ở BE.
export function useCertificateFonts() {
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,700;1,400;1,700&family=Lobster&family=Pacifico&family=Patrick+Hand&display=swap";
    if (document.querySelector(`link[data-cert-fonts]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-cert-fonts", "");
    document.head.appendChild(link);
  }, []);
}

export type FontFamily = "sans" | "serif" | "bevietnam" | "lobster" | "pacifico" | "patrickhand";

export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "sans", label: "Không chân (Sans)" },
  { value: "serif", label: "Có chân (Serif)" },
  { value: "bevietnam", label: "Be Vietnam Pro (Việt)" },
  { value: "patrickhand", label: "Viết tay (Patrick Hand)" },
  { value: "lobster", label: "Thư pháp (Lobster)" },
  { value: "pacifico", label: "Thư pháp (Pacifico)" },
];

export function fontStack(family: FontFamily): string {
  switch (family) {
    case "serif":
      return "Georgia, 'Times New Roman', serif";
    case "bevietnam":
      return "'Be Vietnam Pro', Arial, sans-serif";
    case "lobster":
      return "'Lobster', cursive";
    case "pacifico":
      return "'Pacifico', cursive";
    case "patrickhand":
      return "'Patrick Hand', cursive";
    default:
      return "Arial, Helvetica, sans-serif";
  }
}

export const PAPER_OPTIONS = [
  { value: "A4", label: "A4" },
  { value: "A3", label: "A3" },
  { value: "A5", label: "A5" },
  { value: "LETTER", label: "Letter" },
  { value: "LEGAL", label: "Legal" },
];

// Kích thước (mm) khổ dọc; dùng để tính tỉ lệ khung xem trước.
const PAPER_MM: Record<string, { w: number; h: number }> = {
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  LETTER: { w: 216, h: 279 },
  LEGAL: { w: 216, h: 356 },
};

export function paperAspect(paperSize: string, orientation: string): number {
  const mm = PAPER_MM[paperSize] ?? PAPER_MM.A4;
  return orientation === "PORTRAIT" ? mm.w / mm.h : mm.h / mm.w;
}

export type LayoutItem = {
  // QR: mã QR chứa mã chứng nhận, chỉ được tạo lúc xuất PDF (hệ thống không lưu ảnh QR). x,y là tâm mã.
  type: "FIELD" | "TEXT" | "QR";
  fieldKey?: string;
  text?: string;
  // QR: cạnh mã theo tỉ lệ chiều cao trang (0..1).
  size?: number;
  // QR ở bản xem trước: ảnh QR thật do BE trả về (không lưu).
  image?: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

export type CourseTypeRef = { typeCode: string; typeName: string };

export type ConfigScopeLevel = "SYSTEM" | "DIOCESE" | "DEANERY";

export type ConfigResponse = {
  id: string;
  name: string;
  isDefault: boolean;
  scopeLevel: ConfigScopeLevel;
  // Cấu hình thuộc cấp khác (kế thừa) chỉ được dùng, không được sửa / xóa.
  editable: boolean;
  paperSize?: string;
  orientation?: string;
  backgroundImage?: string;
  fieldLayout?: LayoutItem[];
  usedByCourseTypes: CourseTypeRef[];
  usedByCount: number;
};

export type AssignmentResponse = { courseTypeCode: string; configId: string };

export type FieldCatalogItem = { key: string; label: string; group: string };

// Nội dung thiết kế đang chỉnh (đối tượng được lưu vào lịch sử hoàn tác).
export type DesignForm = {
  name: string;
  paperSize: string;
  orientation: string;
  backgroundImage: string;
  layout: LayoutItem[];
};

export const SCOPE_LABELS: Record<ConfigScopeLevel, string> = {
  SYSTEM: "Hệ thống",
  DIOCESE: "Giáo phận",
  DEANERY: "Giáo hạt",
};

export function blankForm(): DesignForm {
  return { name: "", paperSize: "A4", orientation: "LANDSCAPE", backgroundImage: "", layout: [] };
}

export function formFromConfig(config: ConfigResponse): DesignForm {
  return {
    name: config.name,
    paperSize: config.paperSize ?? "A4",
    orientation: config.orientation ?? "LANDSCAPE",
    backgroundImage: config.backgroundImage ?? "",
    layout: (config.fieldLayout ?? []).map(normalizeItem),
  };
}

export function isSameForm(a: DesignForm, b: DesignForm): boolean {
  return (
    a.name === b.name &&
    a.paperSize === b.paperSize &&
    a.orientation === b.orientation &&
    a.backgroundImage === b.backgroundImage &&
    JSON.stringify(a.layout) === JSON.stringify(b.layout)
  );
}

export function normalizeItem(item: LayoutItem): LayoutItem {
  return {
    type: item.type === "TEXT" ? "TEXT" : item.type === "QR" ? "QR" : "FIELD",
    fieldKey: item.fieldKey,
    text: item.text,
    size: item.type === "QR" ? clamp(typeof item.size === "number" ? item.size : DEFAULT_QR_SIZE, MIN_QR_SIZE, MAX_QR_SIZE) : undefined,
    image: item.image,
    x: typeof item.x === "number" ? item.x : 0.5,
    y: typeof item.y === "number" ? item.y : 0.5,
    fontSize: typeof item.fontSize === "number" && item.fontSize > 0 ? item.fontSize : 0.04,
    color: item.color || "#000000",
    align: item.align === "left" || item.align === "right" ? item.align : "center",
    fontFamily: FONT_OPTIONS.some((option) => option.value === item.fontFamily) ? item.fontFamily : "sans",
    bold: Boolean(item.bold),
    italic: Boolean(item.italic),
    underline: Boolean(item.underline),
  };
}

export const DEFAULT_QR_SIZE = 0.15;
export const MIN_QR_SIZE = 0.05;
export const MAX_QR_SIZE = 0.5;

export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// Giá trị mẫu để xem trước.
export function sampleValue(key: string | undefined, fieldLabel: (key?: string) => string) {
  switch (key) {
    case "signerName":
      return "Nguyễn Văn A";
    case "signerTitle":
      return "Linh mục tuyên úy";
    case "leaderFullName":
      return "Giuse Nguyễn Văn An";
    case "leaderBirthDate":
      return "01/01/1990";
    case "leaderGender":
      return "Nam";
    case "leaderParishName":
      return "Giáo xứ Thượng Phúc";
    case "leaderDeaneryName":
      return "Giáo hạt Phú Cường";
    case "leaderDioceseName":
      return "Phú Cường";
    case "leaderLevel":
      return "Huynh trưởng cấp I";
    case "courseName":
      return "Sa mạc huấn luyện Huynh trưởng cấp I";
    case "courseCode":
      return "KH-2026-01";
    case "hostYear":
      return "2026";
    case "courseStartDate":
      return "15/07/2026";
    case "courseEndDate":
      return "20/07/2026";
    case "coursePeriod":
      return "từ 15/07/2026 đến 20/07/2026";
    case "resultingLevel":
      return "Huynh trưởng cấp I";
    case "certificateCode":
      return "GPPC-HTI-2026-1";
    case "certificateName":
      return "Chứng nhận hoàn thành khóa huấn luyện";
    case "result":
      return "Đạt";
    case "issueDate":
      return "20/10/2026";
    default:
      return fieldLabel(key);
  }
}

// Ngưỡng hút (tỉ lệ) khi canh thẳng hàng.
const SNAP_THRESHOLD = 0.012;

export function CertificateCanvas({
  backgroundImage,
  layout,
  fieldLabel,
  sampleValue: sample,
  preview,
  aspect,
  selectedIndex,
  onSelect,
  onMove,
  editable,
}: {
  backgroundImage: string;
  layout: LayoutItem[];
  fieldLabel: (key?: string) => string;
  sampleValue: (key?: string) => string;
  preview: boolean;
  aspect: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onMove: (index: number, x: number, y: number) => void;
  editable: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Hút toạ độ về tâm (0.5) hoặc trùng với phần tử khác để canh thẳng hàng ngang/dọc.
  function snap(value: number, index: number, axis: "x" | "y") {
    const targets = [0.5, ...layout.filter((_, i) => i !== index).map((item) => item[axis])];
    let snapped = value;
    let guide: number | null = null;
    let best = SNAP_THRESHOLD;
    for (const target of targets) {
      const distance = Math.abs(value - target);
      if (distance <= best) {
        best = distance;
        snapped = target;
        guide = target;
      }
    }
    return { snapped, guide };
  }

  function handlePointerDown(event: React.PointerEvent, index: number) {
    if (!editable) return;
    onSelect(index);
    dragIndex.current = index;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (dragIndex.current == null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const rawY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const sx = snap(rawX, dragIndex.current, "x");
    const sy = snap(rawY, dragIndex.current, "y");
    setGuides({ x: sx.guide, y: sy.guide });
    onMove(dragIndex.current, sx.snapped, sy.snapped);
  }

  function handlePointerUp() {
    dragIndex.current = null;
    setGuides({ x: null, y: null });
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-lg border border-border bg-surface-2"
      style={{ aspectRatio: `${aspect}`, containerType: "size" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {backgroundImage ? (
        // Stretch đầy khung để khớp PDF (ảnh nền được vẽ full trang). Nên dùng ảnh đúng tỉ lệ khổ giấy.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="Ảnh nền chứng nhận" decoding="async" loading="lazy" className="absolute inset-0 h-full w-full object-fill" src={backgroundImage} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted">Chưa có ảnh nền</div>
      )}
      {guides.x != null ? <div className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary/70" style={{ left: `${guides.x * 100}%` }} /> : null}
      {guides.y != null ? <div className="pointer-events-none absolute right-0 left-0 z-20 h-px bg-primary/70" style={{ top: `${guides.y * 100}%` }} /> : null}
      {layout.map((item, index) => {
        if (item.type === "QR") {
          const isQrSelected = !preview && index === selectedIndex;
          const side = `${(item.size ?? DEFAULT_QR_SIZE) * 100}cqh`;
          return (
            <div
              key={index}
              onPointerDown={(event) => handlePointerDown(event, index)}
              className={cn(
                "absolute flex items-center justify-center bg-white text-[10px] font-semibold text-slate-700",
                isQrSelected ? "outline-dashed outline-2 outline-primary" : "",
                editable ? "cursor-move" : "cursor-default",
              )}
              style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: side, height: side, transform: "translate(-50%, -50%)" }}
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Mã QR chứng nhận" decoding="async" loading="lazy" className="h-full w-full" draggable={false} src={item.image} />
              ) : (
                <QrPlaceholder />
              )}
            </div>
          );
        }
        const label = item.type === "TEXT" ? item.text ?? "" : preview ? sample(item.fieldKey) : `[${fieldLabel(item.fieldKey)}]`;
        const isSelected = !preview && index === selectedIndex;
        const translate = item.align === "center" ? "-50%" : item.align === "right" ? "-100%" : "0";
        return (
          <div
            key={index}
            onPointerDown={(event) => handlePointerDown(event, index)}
            className={cn(
              "absolute max-w-[90%] whitespace-nowrap px-1 leading-tight",
              isSelected ? "outline-dashed outline-2 outline-primary" : "",
              editable ? "cursor-move" : "cursor-default",
            )}
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              transform: `translate(${translate}, -50%)`,
              fontSize: `clamp(8px, ${item.fontSize * 100}cqh, 80px)`,
              color: item.color,
              fontFamily: fontStack(item.fontFamily),
              fontWeight: item.bold ? 700 : 400,
              fontStyle: item.italic ? "italic" : "normal",
              textDecoration: item.underline ? "underline" : "none",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
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
