"use client";

import { Question } from "@phosphor-icons/react";
import { Tip } from "@/components/ui/tip";

// Trang hướng dẫn sử dụng (repo HT-NEW-HuongDan, deploy bằng GitHub Pages).
export const USER_GUIDE_URL = "https://nguyentiendat-gtr.github.io/HT-NEW-HuongDan/";

// Nút dấu chấm hỏi ở header (cạnh nút quét QR): mở trang hướng dẫn sử dụng ở tab mới. Mọi tài khoản đều thấy.
export function HeaderHelpLink() {
  return (
    <Tip label="Hướng dẫn sử dụng">
      <a
        aria-label="Mở trang hướng dẫn sử dụng (tab mới)"
        className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:h-10 sm:w-10"
        href={USER_GUIDE_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Question size={22} />
      </a>
    </Tip>
  );
}
