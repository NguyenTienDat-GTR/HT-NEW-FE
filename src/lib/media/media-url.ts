// URL ảnh do backend trả về có dạng "/api/media/{id}/{variant}?exp=...&sig=..." (đã ký, hết hạn sau một thời gian).
// Trình duyệt gọi backend qua proxy "/backend", nên cần ghép tiền tố trước khi dùng làm src.
// Ảnh base64 cũ (data URL, chưa được chuyển lên cloud) và URL tuyệt đối được giữ nguyên.
const MEDIA_PATH_PREFIX = "/api/media/";

export function mediaSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith(MEDIA_PATH_PREFIX)) return `/backend${url}`;
  return url;
}
