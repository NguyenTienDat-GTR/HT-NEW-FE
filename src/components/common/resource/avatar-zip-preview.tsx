"use client";

import { ArrowCounterClockwise, Camera, PencilSimple, Trash, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { countNeedsReview, STATUS_LABELS, type AvatarItem } from "@/lib/media/prepare-avatar-zip";
import { cn } from "@/lib/utils";

// Lưới xem trước ảnh đã tự cắt quanh khuôn mặt: ảnh không thấy mặt / nhiều người / mặt nhỏ được đánh dấu để chỉnh tay hoặc bỏ.
export function AvatarZipPreview({ items, onEdit, onToggleRemoved }: { items: AvatarItem[]; onEdit: (index: number) => void; onToggleRemoved: (index: number) => void }) {
  const [onlyReview, setOnlyReview] = useState(false);
  const needsReview = countNeedsReview(items);
  const kept = items.filter((item) => !item.removed).length;
  const visible = items.map((item, index) => ({ item, index })).filter(({ item }) => !onlyReview || (item.status !== "ok" && !item.removed));

  return (
    <div className="mt-3 rounded-lg border border-border p-3" data-testid="avatar-zip-preview">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-text-secondary">
          Giữ <strong className="text-foreground">{kept}</strong>/{items.length} ảnh
          {needsReview > 0 ? (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
              <Warning size={14} weight="fill" />
              {needsReview} ảnh cần xem lại
            </span>
          ) : null}
        </span>
        {needsReview > 0 ? (
          <Button onClick={() => setOnlyReview((value) => !value)} size="sm" type="button" variant="ghost">
            {onlyReview ? "Hiện tất cả" : "Chỉ hiện ảnh cần xem lại"}
          </Button>
        ) : null}
      </div>
      <ul className="mt-3 grid max-h-[26rem] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
        {visible.map(({ item, index }) => (
          <li className={cn("space-y-1 text-xs", item.removed && "opacity-40")} key={item.entryName}>
            <div className={cn("relative aspect-[2/3] overflow-hidden rounded-md border bg-surface-2", item.status === "ok" ? "border-border" : "border-amber-400")}>
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước cục bộ (blob URL)
                <img alt={item.entryName} className="h-full w-full object-cover" src={item.previewUrl} />
              ) : (
                <span className="flex h-full items-center justify-center text-muted">
                  <Camera size={24} weight="duotone" />
                </span>
              )}
            </div>
            <p className="truncate font-medium text-foreground" title={item.entryName}>
              {item.entryName.slice(item.entryName.lastIndexOf("/") + 1)}
            </p>
            <p className={cn("truncate", item.status === "ok" ? "text-success" : "text-amber-700")}>{STATUS_LABELS[item.status]}</p>
            <div className="flex gap-1">
              {item.previewUrl && !item.removed ? (
                <Button aria-label={`Chỉnh ảnh ${item.entryName}`} onClick={() => onEdit(index)} size="icon" type="button" variant="outline">
                  <PencilSimple size={14} />
                </Button>
              ) : null}
              <Button aria-label={`${item.removed ? "Khôi phục" : "Bỏ"} ảnh ${item.entryName}`} onClick={() => onToggleRemoved(index)} size="icon" type="button" variant="outline">
                {item.removed ? <ArrowCounterClockwise size={14} /> : <Trash size={14} />}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
