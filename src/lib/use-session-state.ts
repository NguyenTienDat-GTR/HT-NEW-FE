"use client";

import { useCallback, useState } from "react";

const PREFIX = "ht:state:";

function read<T>(key: string, initial: T): T {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    return raw === null ? initial : (JSON.parse(raw) as T);
  } catch {
    return initial;
  }
}

function write(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Trình duyệt chặn lưu trữ: bộ lọc vẫn hoạt động bình thường, chỉ không được nhớ.
  }
}

// useState nhưng nhớ giá trị theo phiên trình duyệt: thoát trang, mở modal hay đi trang khác rồi quay lại vẫn giữ bộ lọc.
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial));
  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return [value, update] as const;
}

// Bộ lọc của danh sách tài nguyên lưu dạng chuỗi query (chỉ các tham số bộ lọc, không gồm tham số mở modal).
export function readStoredQuery(key: string): string {
  return read<string>(`query:${key}`, "");
}

export function writeStoredQuery(key: string, query: string) {
  write(`query:${key}`, query);
}
