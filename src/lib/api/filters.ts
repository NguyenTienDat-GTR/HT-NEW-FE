/** Tham số `filters=` của BaseSearchRequest: một đối tượng JSON được mã hóa vào query string. */
export function filtersParam(filters: Record<string, unknown>): string {
  return `filters=${encodeURIComponent(JSON.stringify(filters))}`;
}

/** Nối `filters=` vào đường dẫn, tự chọn `?` hoặc `&` tùy đường dẫn đã có query hay chưa. */
export function withFilters(path: string, filters: Record<string, unknown>): string {
  return `${path}${path.includes("?") ? "&" : "?"}${filtersParam(filters)}`;
}
