"use client";

import { useEffect, useState } from "react";

/** Số giây còn lại tới mốc thời gian `deadline` (ms), cập nhật mỗi giây. */
export function useCountdown(deadline: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  if (!deadline) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatMmSs(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
