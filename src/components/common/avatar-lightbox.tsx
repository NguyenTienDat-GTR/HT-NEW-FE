"use client";

import { X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { mediaSrc } from "@/lib/media/media-url";

// Bọc khung avatar: bấm vào để xem ảnh lớn. Không có ảnh thì chỉ hiện khung, không bấm được.
export function AvatarLightbox({
  src,
  name,
  className,
  children,
}: {
  src?: string | null;
  name: string;
  className?: string;
  children: ReactNode;
}) {
  const resolved = mediaSrc(src);
  if (!resolved) return <span className={className}>{children}</span>;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          aria-label={`Xem ảnh đại diện của ${name}`}
          className={`cursor-zoom-in rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${className ?? ""}`}
          type="button"
        >
          {children}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-[4px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 shadow-2xl focus:outline-none"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="truncate text-base font-semibold text-foreground">{name}</Dialog.Title>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X className="h-[18px] w-[18px]" />
              </Button>
            </Dialog.Close>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh có chữ ký riêng, không đi qua trình tối ưu của next/image */}
          <img alt={`Ảnh đại diện của ${name}`} className="mx-auto block max-h-[70dvh] w-full rounded-xl object-contain" src={resolved} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
