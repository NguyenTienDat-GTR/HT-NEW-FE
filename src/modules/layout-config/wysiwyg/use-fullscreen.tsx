"use client";

import { ArrowsIn, ArrowsOut } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Chế độ toàn màn hình của trình thiết kế: vùng thiết kế phủ kín cửa sổ (che thanh bên và đầu trang) và, nếu trình duyệt cho phép,
 * bật luôn toàn màn hình của trình duyệt. Dùng lớp phủ thay vì chỉ toàn màn hình một phần tử để các bảng nổi (menu, hộp thoại)
 * vẫn hiện được. Nhấn Esc (thoát toàn màn hình của trình duyệt) hoặc bấm nút để quay lại.
 */
export function useDesignerFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);

  const exit = useCallback(() => {
    setFullscreen(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const toggle = useCallback(() => {
    if (fullscreen) {
      exit();
      return;
    }
    setFullscreen(true);
    // Không có / bị chặn toàn màn hình của trình duyệt thì vẫn dùng lớp phủ kín cửa sổ.
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, [fullscreen, exit]);

  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Người dùng thoát toàn màn hình của trình duyệt bằng Esc: thoát cả chế độ thiết kế toàn màn hình.
    function onChange() {
      if (!document.fullscreenElement) setFullscreen(false);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, [fullscreen]);

  // Rời trang khi đang toàn màn hình thì trả trình duyệt về bình thường.
  useEffect(
    () => () => {
      if (typeof document !== "undefined" && document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    },
    [],
  );

  return { fullscreen, toggle };
}

/** Lớp CSS khi bật toàn màn hình: phủ kín cửa sổ, nằm dưới các bảng nổi (z-50). */
export const FULLSCREEN_CLASS = "fixed inset-0 z-40 !h-dvh !min-h-0 rounded-none border-0 lg:!h-dvh";

export function FullscreenButton({ fullscreen, onToggle }: { fullscreen: boolean; onToggle: () => void }) {
  const label = fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình";
  return (
    <Button aria-label={label} aria-pressed={fullscreen} className="h-9 w-9" onClick={onToggle} size="icon" title={`${label}${fullscreen ? " (Esc)" : ""}`} type="button" variant="icon">
      {fullscreen ? <ArrowsIn size={17} /> : <ArrowsOut size={17} />}
    </Button>
  );
}
