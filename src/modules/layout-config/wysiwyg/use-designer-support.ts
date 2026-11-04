"use client";

import { useCallback, useMemo, useState } from "react";
import { fontStack, type LayoutItem } from "@/modules/certificates/components/certificate-design";
import { analyzeLayout, type LayoutWarning } from "./layout-analysis";

export type SampleSetLike = { id: string; label: string; values: Record<string, string> };

/** Bộ dữ liệu mẫu đang dùng để xem trước / thử bố cục; nhớ lựa chọn theo trình duyệt. */
export function useSampleSet<T extends SampleSetLike>(storageKey: string, sets: T[]) {
  const [sampleId, setSampleIdState] = useState<string>(() => {
    try {
      const saved = typeof window === "undefined" ? null : window.localStorage.getItem(storageKey);
      return sets.some((set) => set.id === saved) ? (saved as string) : sets[0].id;
    } catch {
      return sets[0].id;
    }
  });
  const setSampleId = useCallback(
    (id: string) => {
      setSampleIdState(id);
      try {
        window.localStorage.setItem(storageKey, id);
      } catch {
        // Không lưu được thì chỉ giữ trong phiên.
      }
    },
    [storageKey],
  );
  const active = sets.find((set) => set.id === sampleId) ?? sets[0];
  return { sampleId: active.id, setSampleId, values: active.values, sets };
}

// Đo chiều rộng chữ bằng canvas (tỉ lệ chiều rộng trang) ở thang 4px/mm; không có canvas (môi trường thử) thì ước lượng theo số ký tự.
function makeMeasurer(pageWidthMm: number, pageHeightMm: number): ((item: LayoutItem, text: string) => number | null) | undefined {
  if (typeof document === "undefined" || (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent))) return undefined;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return undefined;
  const scale = 4;
  return (item, text) => {
    ctx.font = `${item.italic ? "italic " : ""}${item.bold ? "700" : "400"} ${Math.max(1, item.fontSize * pageHeightMm * scale)}px ${fontStack(item.fontFamily)}`;
    return ctx.measureText(text).width / (pageWidthMm * scale);
  };
}

/** Cảnh báo bố cục (chữ nhỏ, tràn trang, chồng nhau, QR nhỏ, ảnh nền mờ...) tính theo dữ liệu mẫu đang chọn. */
export function useLayoutWarnings(args: {
  layout: LayoutItem[];
  pageWidthMm: number;
  pageHeightMm: number;
  sampleValues: Record<string, string>;
  safeMm: number;
  background: { naturalWidth: number; naturalHeight: number } | null;
  /** Phần tử chữ cố định nội dung (TEXT) hoặc theo trường (FIELD). */
  hasBackground: boolean;
}): LayoutWarning[] {
  const { layout, pageWidthMm, pageHeightMm, sampleValues, safeMm, background, hasBackground } = args;
  return useMemo(
    () =>
      analyzeLayout({
        layout,
        pageWidthMm,
        pageHeightMm,
        textOf: (item) => (item.type === "TEXT" ? (item.text ?? "") : (sampleValues[item.fieldKey ?? ""] ?? "")),
        measureWidth: makeMeasurer(pageWidthMm, pageHeightMm),
        safeMm,
        background: hasBackground ? background : null,
      }),
    [layout, pageWidthMm, pageHeightMm, sampleValues, safeMm, background, hasBackground],
  );
}
