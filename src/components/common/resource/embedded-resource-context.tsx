"use client";

import { createContext, useContext } from "react";

// Danh sách tài nguyên nhúng trong một trang khác (ví dụ tab của khóa huấn luyện):
// bộ lọc cố định, liên kết hành động giữ nguyên trang chứa và quay về đúng tab.
export type EmbeddedResource = {
  // Đường dẫn trang chứa, ví dụ /training/courses/ABC.
  basePath: string;
  tab: string;
  fixedFilters: Record<string, string>;
  // Khóa có đang trong thời gian diễn ra không (false thì tab chấm điểm không cho nhập điểm).
  scoringOpen?: boolean;
  scoringHint?: string;
  // Khóa đang bị khóa chỉnh sửa điểm bởi admin.
  scoreLocked?: boolean;
};

const EmbeddedResourceContext = createContext<EmbeddedResource | null>(null);

export const EmbeddedResourceProvider = EmbeddedResourceContext.Provider;

export function useEmbeddedResource() {
  return useContext(EmbeddedResourceContext);
}

export function embeddedTabHref(embedded: EmbeddedResource) {
  return `${embedded.basePath}?tab=${encodeURIComponent(embedded.tab)}`;
}

// Gắn tham số hành động vào đường dẫn: đường dẫn danh sách thường hoặc tab nhúng.
export function resourceActionHref(path: string, embedded: EmbeddedResource | null, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  if (embedded) return `${embeddedTabHref(embedded)}&${query}`;
  return `${path}?${query}`;
}

// Trang con (form tạo/chấm điểm) cần biết quay lại đâu sau khi lưu.
export function withReturnTo(path: string, embedded: EmbeddedResource | null, extra: Record<string, string> = {}) {
  if (!embedded) return path;
  const params = new URLSearchParams({ ...extra, returnTo: embeddedTabHref(embedded) });
  return `${path}${path.includes("?") ? "&" : "?"}${params.toString()}`;
}
