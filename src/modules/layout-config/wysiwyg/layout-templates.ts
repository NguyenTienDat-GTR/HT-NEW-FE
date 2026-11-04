import type { LayoutItem } from "@/modules/certificates/components/certificate-design";

export type LayoutTemplate = {
  id: string;
  label: string;
  description: string;
  items: LayoutItem[];
};

const STYLE = { color: "#1f2937", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false } as const;

function field(fieldKey: string, x: number, y: number, fontSize: number, extra: Partial<LayoutItem> = {}): LayoutItem {
  return { type: "FIELD", fieldKey, x, y, fontSize, ...STYLE, ...extra };
}

function text(value: string, x: number, y: number, fontSize: number, extra: Partial<LayoutItem> = {}): LayoutItem {
  return { type: "TEXT", text: value, x, y, fontSize, ...STYLE, ...extra };
}

/** Mẫu bố cục chứng nhận dựng sẵn: người dùng chọn rồi chỉnh tiếp. Khi áp mẫu thì thay toàn bộ bố cục (hoàn tác được). */
export const CERTIFICATE_TEMPLATES: LayoutTemplate[] = [
  {
    id: "classic-center",
    label: "Cân đối giữa trang",
    description: "Tên huynh trưởng lớn ở giữa, thông tin khóa bên dưới, người ký ở góc phải.",
    items: [
      text("CHỨNG NHẬN", 0.5, 0.22, 0.07, { bold: true, fontFamily: "playfair" }),
      text("Huynh trưởng", 0.5, 0.34, 0.032),
      field("leaderFullName", 0.5, 0.45, 0.06, { bold: true, fontFamily: "playfair" }),
      field("leaderParishName", 0.5, 0.54, 0.032),
      text("đã hoàn thành khóa", 0.5, 0.62, 0.03),
      field("courseName", 0.5, 0.69, 0.04, { bold: true }),
      field("coursePeriod", 0.5, 0.76, 0.026),
      field("signerTitle", 0.78, 0.83, 0.026),
      field("signerName", 0.78, 0.93, 0.03, { bold: true }),
      field("certificateCode", 0.2, 0.93, 0.022, { align: "left", x: 0.1 }),
    ],
  },
  {
    id: "left-aligned",
    label: "Canh trái, hai cột",
    description: "Nội dung canh trái; ảnh huynh trưởng và mã QR ở cột phải.",
    items: [
      text("CHỨNG NHẬN", 0.08, 0.2, 0.065, { align: "left", bold: true }),
      field("leaderFullName", 0.08, 0.36, 0.055, { align: "left", bold: true }),
      field("leaderParishName", 0.08, 0.45, 0.03, { align: "left" }),
      field("courseName", 0.08, 0.58, 0.038, { align: "left", bold: true }),
      field("coursePeriod", 0.08, 0.65, 0.026, { align: "left" }),
      field("courseLocation", 0.08, 0.71, 0.026, { align: "left" }),
      field("signerTitle", 0.08, 0.83, 0.026, { align: "left" }),
      field("signerName", 0.08, 0.93, 0.03, { align: "left", bold: true }),
      { type: "PHOTO", photoRatio: "3x4", size: 0.34, x: 0.82, y: 0.36, fontSize: 0.04, ...STYLE },
      { type: "QR", size: 0.16, x: 0.82, y: 0.78, fontSize: 0.04, ...STYLE },
      field("certificateCode", 0.82, 0.92, 0.022),
    ],
  },
  {
    id: "minimal-name",
    label: "Tối giản: tên và khóa",
    description: "Chỉ tên huynh trưởng, tên khóa và ngày cấp; phù hợp ảnh nền đã in sẵn nhiều chữ.",
    items: [
      field("leaderFullName", 0.5, 0.5, 0.07, { bold: true }),
      field("courseName", 0.5, 0.62, 0.04),
      field("issueDate", 0.5, 0.88, 0.028),
    ],
  },
];

/** Mẫu bố cục thẻ tham dự dựng sẵn (thẻ ngang 90×55mm là phổ biến nhất). */
export const BADGE_TEMPLATES: LayoutTemplate[] = [
  {
    id: "badge-name-team",
    label: "Tên lớn + đội",
    description: "Tên thánh và họ tên lớn ở giữa, đội và đơn vị bên dưới, mã QR góc phải.",
    items: [
      field("courseName", 0.5, 0.12, 0.08, { bold: true }),
      field("holyName", 0.5, 0.36, 0.1),
      field("leaderName", 0.5, 0.52, 0.13, { bold: true }),
      field("teamName", 0.5, 0.7, 0.09, { color: "#b91c1c", bold: true }),
      field("leaderParishName", 0.5, 0.86, 0.07),
      { type: "QR", size: 0.28, x: 0.88, y: 0.8, fontSize: 0.04, ...STYLE },
    ],
  },
  {
    id: "badge-photo-left",
    label: "Ảnh bên trái",
    description: "Ảnh huynh trưởng bên trái, thông tin canh trái bên phải.",
    items: [
      { type: "PHOTO", photoRatio: "3x4", size: 0.62, x: 0.2, y: 0.52, fontSize: 0.04, ...STYLE },
      field("courseName", 0.4, 0.14, 0.07, { align: "left", bold: true }),
      field("leaderFullName", 0.4, 0.42, 0.1, { align: "left", bold: true }),
      field("leaderParishName", 0.4, 0.58, 0.07, { align: "left" }),
      field("teamName", 0.4, 0.74, 0.08, { align: "left", color: "#b91c1c", bold: true }),
      { type: "QR", size: 0.26, x: 0.9, y: 0.78, fontSize: 0.04, ...STYLE },
    ],
  },
];
