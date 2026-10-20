"use client";

import { useEffect, useState } from "react";

// Mọi ô tìm kiếm gọi API chỉ gửi request khi người dùng ngừng nhập tối thiểu từng này mili giây (tránh bị rate limit).
export const SEARCH_DEBOUNCE_MS = 400;

export function useDebouncedValue<T>(value: T, delay: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
