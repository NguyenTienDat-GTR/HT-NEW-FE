// Chuẩn bị ZIP ảnh đại diện cho import hàng loạt: giải nén từng ảnh, cắt khổ 2:3 quanh khuôn mặt (480x720 JPEG), rồi đóng lại thành
// ZIP nhẹ để gửi cùng file Excel. Giữ nguyên tên entry để khớp cột "Tên file ảnh" trong Excel; nội dung đã là JPEG nên server không cắt lại.
import { unzipSync, zipSync } from "fflate";
import { cropPortraitToFile } from "@/lib/media/compress-image";
import { computeFaceCrop, detectFaces, type CropStatus } from "@/lib/media/face-crop";

export const MAX_SOURCE_ZIP_BYTES = 300 * 1024 * 1024;
// Khớp giới hạn của backend cho file ZIP ảnh.
export const MAX_OUTPUT_ZIP_BYTES = 50 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 5000;

// Nén nhẹ hơn ảnh đơn lẻ để một ZIP 50MB chứa được nhiều ảnh hơn; server vẫn nén lại khi lưu.
const BATCH_JPEG_QUALITY = 0.85;

const IMAGE_NAME = /\.(jpe?g|png|webp)$/i;

// unreadable: trình duyệt không đọc được ảnh (ví dụ hỏng): giữ nguyên để server báo lỗi đúng dòng.
export type AvatarStatus = CropStatus | "unreadable";

export type AvatarItem = {
  entryName: string;
  status: AvatarStatus;
  bytes: Uint8Array;
  // Ảnh đã cắt để xem trước (blob URL); rỗng nếu không đọc được ảnh.
  previewUrl: string;
  removed: boolean;
};

export type PreparedAvatarZip = {
  // Toàn bộ ZIP gốc, giữ lại để lấy ảnh gốc khi người dùng chỉnh tay.
  source: Uint8Array;
  items: AvatarItem[];
};

export class AvatarZipError extends Error {}

// Entry là ảnh dùng được: bỏ thư mục, __MACOSX, file ẩn và tệp không phải ảnh.
export function isImageEntry(name: string) {
  const normalized = name.replace(/\\/g, "/");
  if (normalized.endsWith("/") || normalized.startsWith("__MACOSX/") || normalized.includes("/__MACOSX/")) return false;
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  return !base.startsWith(".") && IMAGE_NAME.test(base);
}

function listImageEntries(source: Uint8Array): string[] {
  const names: string[] = [];
  let total = 0;
  // Trả false để chỉ liệt kê, chưa giải nén gì.
  unzipSync(source, {
    filter: (info) => {
      total += 1;
      if (total > MAX_ZIP_ENTRIES) throw new AvatarZipError(`ZIP có quá ${MAX_ZIP_ENTRIES} tệp, vui lòng chia nhỏ`);
      if (isImageEntry(info.name)) names.push(info.name);
      return false;
    },
  });
  return names;
}

export function readEntry(source: Uint8Array, name: string): Uint8Array {
  const entries = unzipSync(source, { filter: (info) => info.name === name });
  const bytes = entries[name];
  if (!bytes) throw new AvatarZipError(`Không tìm thấy ${name} trong ZIP`);
  return bytes;
}

function toBlob(bytes: Uint8Array) {
  return new Blob([bytes as BlobPart]);
}

const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function processEntry(source: Uint8Array, entryName: string): Promise<AvatarItem> {
  const original = readEntry(source, entryName);
  let bitmap: ImageBitmap;
  try {
    // "from-image": xoay theo EXIF để ảnh chụp từ điện thoại không bị nghiêng.
    bitmap = await createImageBitmap(toBlob(original), { imageOrientation: "from-image" });
  } catch {
    return { entryName, status: "unreadable", bytes: original, previewUrl: "", removed: false };
  }
  try {
    const faces = await detectFaces(bitmap, bitmap.width, bitmap.height);
    // Model không nạp được (faces = null): cắt giữa và đánh dấu cần kiểm tra như khi không thấy mặt.
    const { rect, status } = computeFaceCrop(bitmap.width, bitmap.height, faces ?? []);
    const cropped = await cropPortraitToFile(bitmap, rect, entryName, BATCH_JPEG_QUALITY);
    return { entryName, status, bytes: new Uint8Array(await cropped.arrayBuffer()), previewUrl: URL.createObjectURL(cropped), removed: false };
  } finally {
    bitmap.close();
  }
}

// Xử lý tuần tự từng ảnh để không giữ nhiều ảnh giải nén cùng lúc trong bộ nhớ.
export async function prepareAvatarZip(file: File, onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<PreparedAvatarZip> {
  if (!file.name.toLowerCase().endsWith(".zip")) throw new AvatarZipError("Ảnh phải được nén thành file .zip");
  if (file.size > MAX_SOURCE_ZIP_BYTES) throw new AvatarZipError("File ZIP vượt quá 300MB, vui lòng chia nhỏ");
  const source = new Uint8Array(await file.arrayBuffer());
  let names: string[];
  try {
    names = listImageEntries(source);
  } catch (error) {
    if (error instanceof AvatarZipError) throw error;
    throw new AvatarZipError("Không đọc được file ZIP, tệp có thể bị hỏng");
  }
  if (names.length === 0) throw new AvatarZipError("ZIP không có ảnh JPG, PNG hoặc WebP");
  const items: AvatarItem[] = [];
  onProgress(0, names.length);
  for (const name of names) {
    if (signal?.aborted) {
      revokeAvatarPreviews(items);
      throw new AvatarZipError("Đã hủy xử lý ảnh");
    }
    items.push(await processEntry(source, name));
    onProgress(items.length, names.length);
    await nextFrame();
  }
  return { source, items };
}

// Đóng các ảnh còn giữ lại thành ZIP gửi lên server (JPEG đã nén nên không nén thêm).
export function buildAvatarZip(items: AvatarItem[]): File | null {
  const kept = items.filter((item) => !item.removed);
  if (kept.length === 0) return null;
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const item of kept) files[item.entryName] = [item.bytes, { level: 0 }];
  return new File([toBlob(zipSync(files))], "anh-dai-dien.zip", { type: "application/zip" });
}

export function revokeAvatarPreviews(items: AvatarItem[]) {
  for (const item of items) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
}

// Số ảnh cần người dùng xem lại (không thấy mặt, nhiều người, mặt nhỏ, không đọc được) và chưa bị bỏ.
export function countNeedsReview(items: AvatarItem[]) {
  return items.filter((item) => !item.removed && item.status !== "ok").length;
}

export const STATUS_LABELS: Record<AvatarStatus, string> = {
  ok: "Đã căn giữa mặt",
  "no-face": "Không thấy mặt",
  "multi-face": "Nhiều người trong ảnh",
  small: "Mặt quá nhỏ",
  unreadable: "Không đọc được ảnh",
};
