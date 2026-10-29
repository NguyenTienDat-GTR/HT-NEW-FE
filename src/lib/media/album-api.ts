import { apiFetch } from "@/lib/api/client";
import { compressImage } from "./compress-image";

// Khớp enum AlbumKind của backend: album ảnh nền của chứng nhận, của mặt trước thẻ hoặc của mặt sau thẻ (mỗi album riêng).
export type AlbumKind = "CERTIFICATE" | "BADGE_FRONT" | "BADGE_BACK";

export type AlbumItem = {
  id: string;
  assetId: string;
  // URL đã ký (hết hạn sau một thời gian) của ảnh xem trước.
  url: string;
  createdAt: string;
};

export type Album = {
  maxItems: number;
  items: AlbumItem[];
};

export const albumQueryKey = (kind: AlbumKind) => ["background-album", kind] as const;

// Album chỉ của đơn vị đang đăng nhập (giáo phận / giáo hạt); đơn vị khác không thấy.
export const albumApi = {
  list: (kind: AlbumKind) => apiFetch<Album>(`/media/albums/${kind}`),

  // Nén ảnh nền trên trình duyệt rồi thêm vào album. Album đủ ảnh thì backend trả lỗi 409.
  async add(kind: AlbumKind, file: File) {
    const compressed = await compressImage(file, "background");
    const body = new FormData();
    body.append("file", compressed, compressed.name);
    return apiFetch<AlbumItem>(`/media/albums/${kind}`, { method: "POST", body });
  },

  remove: (kind: AlbumKind, itemId: string) => apiFetch<null>(`/media/albums/${kind}/${itemId}`, { method: "DELETE" }),
};
