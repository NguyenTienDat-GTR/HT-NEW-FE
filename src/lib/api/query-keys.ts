/**
 * Khóa React Query dùng chung. Mọi danh sách/chi tiết tài nguyên nằm dưới gốc "resource" nên
 * `resourceKey()` làm mới (hoặc xóa) toàn bộ, còn `resourceKey(endpoint)` chỉ làm mới một tài nguyên.
 */
const RESOURCE_ROOT = "resource";

export function resourceKey(...parts: readonly unknown[]) {
  return [RESOURCE_ROOT, ...parts] as const;
}

/** Khóa của một trang danh sách: endpoint + query string đã chuẩn hóa. */
export function resourceListKey(endpoint: string, queryString: string | undefined) {
  return resourceKey(endpoint, queryString);
}
