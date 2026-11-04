"use client";

import { useEffect } from "react";
import { CERTIFICATE_SAMPLE_VALUES } from "../certificate-sample-values";

// Nạp phông chữ (có dấu tiếng Việt) để xem trước khớp PDF; PDF dùng font nhúng ở BE.
export function useCertificateFonts() {
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,700;1,400;1,700" +
      "&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400;0,700;1,400;1,700" +
      "&family=Lora:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700" +
      "&family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700" +
      "&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Lobster&family=Pacifico&family=Patrick+Hand&display=swap";
    if (document.querySelector(`link[data-cert-fonts]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-cert-fonts", "");
    document.head.appendChild(link);
  }, []);
}

export type FontFamily =
  | "sans"
  | "serif"
  | "bevietnam"
  | "roboto"
  | "montserrat"
  | "lora"
  | "playfair"
  | "notoserif"
  | "tinos"
  | "dancing"
  | "greatvibes"
  | "lobster"
  | "pacifico"
  | "patrickhand";

// Khóa phải trùng với bảng ánh xạ file TTF ở BE (CertificatePdfRenderer.fontResource).
export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "sans", label: "Không chân (Sans)" },
  { value: "serif", label: "Có chân (Serif)" },
  { value: "tinos", label: "Times (Tinos)" },
  { value: "roboto", label: "Roboto" },
  { value: "montserrat", label: "Montserrat" },
  { value: "bevietnam", label: "Be Vietnam Pro (Việt)" },
  { value: "lora", label: "Lora" },
  { value: "notoserif", label: "Noto Serif" },
  { value: "playfair", label: "Playfair Display" },
  { value: "dancing", label: "Thư pháp (Dancing Script)" },
  { value: "greatvibes", label: "Thư pháp (Great Vibes)" },
  { value: "patrickhand", label: "Viết tay (Patrick Hand)" },
  { value: "lobster", label: "Thư pháp (Lobster)" },
  { value: "pacifico", label: "Thư pháp (Pacifico)" },
];

export function fontStack(family: FontFamily): string {
  switch (family) {
    case "serif":
      return "Georgia, 'Times New Roman', serif";
    case "tinos":
      return "'Tinos', 'Times New Roman', serif";
    case "roboto":
      return "'Roboto', Arial, sans-serif";
    case "montserrat":
      return "'Montserrat', Arial, sans-serif";
    case "lora":
      return "'Lora', Georgia, serif";
    case "notoserif":
      return "'Noto Serif', Georgia, serif";
    case "playfair":
      return "'Playfair Display', Georgia, serif";
    case "dancing":
      return "'Dancing Script', cursive";
    case "greatvibes":
      return "'Great Vibes', cursive";
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

export type PhotoRatio = "4x6" | "3x4" | "free";

export const PHOTO_RATIO_OPTIONS: { value: PhotoRatio; label: string }[] = [
  { value: "4x6", label: "4x6 (dọc)" },
  { value: "3x4", label: "3x4 (dọc)" },
  { value: "free", label: "Tự do (kéo giãn / co lại)" },
];

export type LayoutItem = {
  // QR: mã QR chứa mã chứng nhận, chỉ được tạo lúc xuất PDF (hệ thống không lưu ảnh QR). x,y là tâm mã.
  // PHOTO: ảnh đại diện của huynh trưởng (chiều cao = size), lấy từ hồ sơ huynh trưởng lúc xuất / xem trước.
  type: "FIELD" | "TEXT" | "QR" | "PHOTO";
  fieldKey?: string;
  text?: string;
  // QR: cạnh mã; PHOTO: chiều cao ảnh — đều theo tỉ lệ chiều cao trang (0..1).
  size?: number;
  // PHOTO: khổ ảnh 4x6 (rộng:cao = 2:3), 3x4 hoặc "free" (tự kéo giãn, dùng photoWidth).
  photoRatio?: PhotoRatio;
  // PHOTO khổ tự do: chiều rộng ảnh theo tỉ lệ chiều cao trang.
  photoWidth?: number;
  // PHOTO ở bản xem trước chứng nhận: tỉ lệ rộng/cao do backend tính.
  aspect?: number;
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
  // Khóa: không kéo / đổi cỡ được trong trình soạn (vẫn in bình thường). Ẩn: không hiện trong trình soạn xem trước và không in.
  locked?: boolean;
  hidden?: boolean;
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
  // URL ảnh nền đã ký (hết hạn sau một thời gian) và id asset để gửi lại khi lưu.
  backgroundImage?: string;
  backgroundAssetId?: string | null;
  // Kích thước (px) của ảnh nền gốc dùng để in (không phải ảnh xem trước); null với ảnh cũ chưa chuyển lên cloud.
  backgroundWidthPx?: number | null;
  backgroundHeightPx?: number | null;
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
  backgroundAssetId: string;
  layout: LayoutItem[];
};

export const SCOPE_LABELS: Record<ConfigScopeLevel, string> = {
  SYSTEM: "Hệ thống",
  DIOCESE: "Giáo phận",
  DEANERY: "Giáo hạt",
};

export function blankForm(): DesignForm {
  return { name: "", paperSize: "A4", orientation: "LANDSCAPE", backgroundImage: "", backgroundAssetId: "", layout: [] };
}

export function formFromConfig(config: ConfigResponse): DesignForm {
  return {
    name: config.name,
    paperSize: config.paperSize ?? "A4",
    orientation: config.orientation ?? "LANDSCAPE",
    backgroundImage: config.backgroundImage ?? "",
    backgroundAssetId: config.backgroundAssetId ?? "",
    layout: (config.fieldLayout ?? []).map(normalizeItem),
  };
}

export function isSameForm(a: DesignForm, b: DesignForm): boolean {
  return (
    a.name === b.name &&
    a.paperSize === b.paperSize &&
    a.orientation === b.orientation &&
    // URL ảnh là link ký có hạn nên thay đổi theo thời gian: so sánh theo id asset (ảnh base64 cũ chưa có id thì so sánh nội dung).
    a.backgroundAssetId === b.backgroundAssetId &&
    (a.backgroundAssetId !== "" || a.backgroundImage === b.backgroundImage) &&
    JSON.stringify(a.layout) === JSON.stringify(b.layout)
  );
}

export function normalizeItem(item: LayoutItem): LayoutItem {
  return {
    type: item.type === "TEXT" ? "TEXT" : item.type === "QR" ? "QR" : item.type === "PHOTO" ? "PHOTO" : "FIELD",
    fieldKey: item.fieldKey,
    text: item.text,
    size:
      item.type === "QR"
        ? clamp(typeof item.size === "number" ? item.size : DEFAULT_QR_SIZE, MIN_QR_SIZE, MAX_QR_SIZE)
        : item.type === "PHOTO"
          ? clamp(typeof item.size === "number" ? item.size : DEFAULT_PHOTO_SIZE, MIN_PHOTO_SIZE, MAX_PHOTO_SIZE)
          : undefined,
    photoRatio: item.type === "PHOTO" ? (item.photoRatio === "3x4" || item.photoRatio === "free" ? item.photoRatio : "4x6") : undefined,
    photoWidth:
      item.type === "PHOTO" && item.photoRatio === "free" && typeof item.photoWidth === "number"
        ? clamp(item.photoWidth, MIN_PHOTO_WIDTH, MAX_PHOTO_WIDTH)
        : undefined,
    aspect: item.type === "PHOTO" ? item.aspect : undefined,
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
    ...(item.locked ? { locked: true } : {}),
    ...(item.hidden ? { hidden: true } : {}),
  };
}

export const DEFAULT_QR_SIZE = 0.15;

// Tên cấu hình tối đa (BE cắt ở 200 ký tự).
export const MAX_NAME_LENGTH = 200;
export const MIN_QR_SIZE = 0.05;
export const MAX_QR_SIZE = 0.5;

// Ảnh huynh trưởng: cạnh ô vuông theo tỉ lệ chiều cao trang / thẻ.
export const DEFAULT_PHOTO_SIZE = 0.25;
export const MAX_PHOTO_WIDTH = 1.2;
export const MIN_PHOTO_WIDTH = 0.03;
export const MIN_PHOTO_SIZE = 0.05;
export const MAX_PHOTO_SIZE = 0.9;

// Tỉ lệ rộng/cao của ô ảnh huynh trưởng theo khổ đã chọn.
export function photoAspect(item: Pick<LayoutItem, "photoRatio" | "photoWidth" | "size" | "aspect">): number {
  if (typeof item.aspect === "number" && item.aspect > 0) return item.aspect;
  if (item.photoRatio === "3x4") return 3 / 4;
  if (item.photoRatio === "free") {
    const height = item.size && item.size > 0 ? item.size : DEFAULT_PHOTO_SIZE;
    const width = item.photoWidth && item.photoWidth > 0 ? item.photoWidth : (height * 2) / 3;
    return clamp(width / height, 0.2, 3);
  }
  return 2 / 3;
}

export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// Giá trị mẫu để xem trước.
export function sampleValue(key: string | undefined, fieldLabel: (key?: string) => string, values: Record<string, string> = CERTIFICATE_SAMPLE_VALUES) {
  // Giá trị mẫu rỗng có chủ ý (ví dụ giáo họ của huynh trưởng thuộc giáo xứ) thì để trống, không hiện nhãn trường.
  if (key && Object.prototype.hasOwnProperty.call(values, key)) return values[key];
  return fieldLabel(key);
}


/** Chiều cao trang (mm) theo khổ giấy và hướng in; dùng đổi cỡ chữ sang pt. */
export function paperHeightMm(paperSize: string, orientation: string): number {
  const mm = PAPER_MM[paperSize] ?? PAPER_MM.A4;
  return orientation === "PORTRAIT" ? mm.h : mm.w;
}

/** Chiều rộng trang (mm) theo khổ giấy và hướng in. */
export function paperWidthMm(paperSize: string, orientation: string): number {
  const mm = PAPER_MM[paperSize] ?? PAPER_MM.A4;
  return orientation === "PORTRAIT" ? mm.w : mm.h;
}
