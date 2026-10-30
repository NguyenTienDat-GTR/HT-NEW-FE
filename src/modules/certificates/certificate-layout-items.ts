import { DEFAULT_PHOTO_SIZE, DEFAULT_QR_SIZE, type LayoutItem } from "./components/certificate-design";

// Kiểu chữ mặc định của mọi phần tử mới thêm vào bố cục.
const BASE_STYLE = {
  fontSize: 0.04,
  color: "#000000",
  align: "center",
  fontFamily: "sans",
  bold: false,
  italic: false,
  underline: false,
} as const;

/** Trường dữ liệu lấy từ hồ sơ chứng nhận (mail merge). */
export function fieldItem(fieldKey: string): LayoutItem {
  return { type: "FIELD", fieldKey, x: 0.5, y: 0.5, ...BASE_STYLE };
}

export function textItem(): LayoutItem {
  return { type: "TEXT", text: "Văn bản", x: 0.5, y: 0.5, ...BASE_STYLE };
}

/** Chỉ khi bố cục có phần tử QR thì khi xuất PDF mới sinh mã QR cho chứng nhận. */
export function qrItem(): LayoutItem {
  return { type: "QR", size: DEFAULT_QR_SIZE, x: 0.88, y: 0.82, ...BASE_STYLE };
}

/** Ảnh đại diện của huynh trưởng nhận chứng nhận, lấy từ hồ sơ huynh trưởng lúc xuất PDF / xem trước. */
export function photoItem(): LayoutItem {
  return { type: "PHOTO", photoRatio: "4x6", size: DEFAULT_PHOTO_SIZE, x: 0.12, y: 0.3, ...BASE_STYLE };
}
