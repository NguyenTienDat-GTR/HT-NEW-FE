import { apiFetch } from "@/lib/api/client";
import { compressImage, type ImagePreset } from "./compress-image";

// Khớp enum MediaCategory của backend.
export type MediaCategory = "LEADER_AVATAR" | "ACCOUNT_AVATAR" | "CERTIFICATE_BACKGROUND" | "BADGE_BACKGROUND";

export type MediaUploadResult = {
  assetId: string;
  category: MediaCategory;
  // URL đã ký của ảnh hiển thị (xem trước ngay sau khi tải lên) và ảnh nhỏ.
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  bytes: number;
};

const PRESET_BY_CATEGORY: Record<MediaCategory, ImagePreset> = {
  LEADER_AVATAR: "avatar",
  ACCOUNT_AVATAR: "avatar",
  CERTIFICATE_BACKGROUND: "background",
  BADGE_BACKGROUND: "background",
};

// Nén ảnh trên trình duyệt rồi tải lên backend. Ảnh ở trạng thái "chờ gắn" cho tới khi được lưu cùng bản ghi.
export async function uploadMedia(file: File, category: MediaCategory): Promise<MediaUploadResult> {
  const compressed = await compressImage(file, PRESET_BY_CATEGORY[category]);
  return uploadPreparedMedia(compressed, category);
}

// Tải lên ảnh đã được nén sẵn (ví dụ ảnh đã xem trước trong hộp chọn ảnh), không nén lại lần hai.
export async function uploadPreparedMedia(file: File, category: MediaCategory): Promise<MediaUploadResult> {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("category", category);
  return apiFetch<MediaUploadResult>("/media", { method: "POST", body });
}
