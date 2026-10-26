"use client";

import { useSyncExternalStore } from "react";

// Điểm gãy trùng với Tailwind: lg = 1024px là ngưỡng bắt đầu có sidebar cố định và đủ chỗ cho bảng dữ liệu.
export const DESKTOP_QUERY = "(min-width: 1024px)";

// Theo dõi media query. Server và môi trường không có matchMedia (jsdom) trả về `serverValue` để HTML hydrate khớp nhau.
export function useMediaQuery(query: string, serverValue = true) {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}

// true từ 1024px trở lên: hiện bảng dữ liệu; dưới ngưỡng này (tablet dọc, điện thoại) chuyển sang dạng thẻ.
export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY);
}
