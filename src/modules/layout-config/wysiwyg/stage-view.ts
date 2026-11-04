import { useCallback, useState } from "react";

// Tùy chọn hiển thị của khung thiết kế (không lưu vào cấu hình, chỉ nhớ theo trình duyệt của người dùng).
export type StageView = {
  /** 1 = vừa khung nhìn; 0.25 … 4. */
  zoom: number;
  grid: boolean;
  snapToGrid: boolean;
  /** Bước lưới (mm). */
  gridMm: number;
  rulers: boolean;
  /** Vùng an toàn (mm) tính từ mép; 0 = tắt. */
  safeMm: number;
  /** Độ mờ ảnh nền khi thiết kế (0.1 … 1). */
  bgOpacity: number;
};

export const DEFAULT_STAGE_VIEW: StageView = { zoom: 1, grid: false, snapToGrid: false, gridMm: 5, rulers: true, safeMm: 0, bgOpacity: 1 };
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

/** Mức thu phóng kế tiếp / trước theo các bậc có sẵn. */
export function stepZoom(current: number, direction: 1 | -1): number {
  if (direction === 1) return ZOOM_STEPS.find((z) => z > current + 0.001) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.001) ?? MIN_ZOOM;
}

/** Chuẩn hóa dữ liệu đọc từ localStorage: giá trị lạ thì dùng mặc định. */
export function parseStageView(raw: string | null): StageView {
  if (!raw) return DEFAULT_STAGE_VIEW;
  try {
    const data = JSON.parse(raw) as Partial<StageView>;
    const num = (value: unknown, fallback: number, min: number, max: number) =>
      typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
    return {
      // Mức thu phóng không nhớ: luôn mở ở chế độ vừa khung để không bất ngờ khi mở lại.
      zoom: 1,
      grid: bool(data.grid, DEFAULT_STAGE_VIEW.grid),
      snapToGrid: bool(data.snapToGrid, DEFAULT_STAGE_VIEW.snapToGrid),
      gridMm: num(data.gridMm, DEFAULT_STAGE_VIEW.gridMm, 1, 50),
      rulers: bool(data.rulers, DEFAULT_STAGE_VIEW.rulers),
      safeMm: num(data.safeMm, DEFAULT_STAGE_VIEW.safeMm, 0, 30),
      bgOpacity: num(data.bgOpacity, DEFAULT_STAGE_VIEW.bgOpacity, 0.1, 1),
    };
  } catch {
    return DEFAULT_STAGE_VIEW;
  }
}

/** Trạng thái hiển thị của khung thiết kế, nhớ theo trình duyệt (bọc try/catch vì có thể bị chặn lưu trữ). */
export function useStageView(storageKey: string) {
  const [view, setViewState] = useState<StageView>(() => {
    try {
      return parseStageView(typeof window === "undefined" ? null : window.localStorage.getItem(storageKey));
    } catch {
      return DEFAULT_STAGE_VIEW;
    }
  });
  const setView = useCallback(
    (patch: Partial<StageView>) => {
      setViewState((current) => {
        const next = { ...current, ...patch };
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Không lưu được thì chỉ giữ trong phiên.
        }
        return next;
      });
    },
    [storageKey],
  );
  return { view, setView };
}
