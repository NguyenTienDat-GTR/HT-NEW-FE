"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mediaSrc } from "@/lib/media/media-url";

// Ảnh tròn / khung ảnh lấy từ backend: tải lười, giải mã bất đồng bộ, tự rơi về phần dự phòng khi ảnh lỗi hoặc hết hạn.
export function MediaImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const resolved = mediaSrc(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !resolved || failedSrc === resolved;

  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ảnh có chữ ký riêng, không đi qua trình tối ưu của next/image
    <img
      alt={alt}
      className={cn("shrink-0 object-cover", className)}
      decoding="async"
      loading="lazy"
      onError={() => setFailedSrc(resolved)}
      src={resolved}
    />
  );
}
