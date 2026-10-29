"use client";

import { Check, Images, MagnifyingGlassPlus, Trash, UploadSimple, Warning, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { albumApi, albumQueryKey, type AlbumItem, type AlbumKind } from "@/lib/media/album-api";
import { ImageValidationError } from "@/lib/media/compress-image";
import { mediaSrc } from "@/lib/media/media-url";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<AlbumKind, string> = { CERTIFICATE: "chứng nhận", BADGE_FRONT: "mặt trước thẻ", BADGE_BACK: "mặt sau thẻ" };

// Album ảnh nền của đơn vị: tối đa vài ảnh cho mỗi loại, chọn một ảnh để đưa vào cấu hình đang soạn.
export function BackgroundAlbumDialog({
  kind,
  open,
  onOpenChange,
  currentAssetId,
  onPick,
}: {
  kind: AlbumKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Ảnh nền hiện đang dùng trong cấu hình (để đánh dấu).
  currentAssetId?: string | null;
  onPick: (item: AlbumItem) => void;
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl focus:outline-none sm:p-6"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Images aria-hidden className="h-5 w-5" weight="bold" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">Album ảnh nền {KIND_LABEL[kind]}</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm leading-5 text-text-secondary">
                  Album chỉ của đơn vị bạn, đơn vị khác không nhìn thấy. Chọn một ảnh để dùng làm ảnh nền cho cấu hình.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X className="h-[18px] w-[18px]" />
              </Button>
            </Dialog.Close>
          </div>
          <AlbumBody currentAssetId={currentAssetId} kind={kind} onPick={(item) => { onPick(item); onOpenChange(false); }} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AlbumBody({ kind, currentAssetId, onPick }: { kind: AlbumKind; currentAssetId?: string | null; onPick: (item: AlbumItem) => void }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewItem, setPreviewItem] = useState<{ item: AlbumItem; index: number } | null>(null);
  const query = useQuery({ queryKey: albumQueryKey(kind), queryFn: () => albumApi.list(kind) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: albumQueryKey(kind) });

  const addMutation = useMutation({
    mutationFn: (file: File) => albumApi.add(kind, file),
    onSuccess: async () => {
      toast.success("Đã thêm ảnh vào album");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ImageValidationError ? error.message : getApiErrorMessage(error)),
  });
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => albumApi.remove(kind, itemId),
    onSuccess: async () => {
      toast.success("Đã xóa ảnh khỏi album");
      await refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const album = query.data;
  const max = album?.maxItems ?? 3;
  const items = album?.items ?? [];
  const full = items.length >= max;
  const slots = Array.from({ length: Math.max(max, items.length) }, (_, index) => items[index] ?? null);

  return (
    <div className="mt-4 space-y-4">
      {full ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900" role="note">
          <Warning aria-hidden className="mt-0.5 h-5 w-5 shrink-0" weight="fill" />
          <p>
            Album đã đủ <strong>{max} ảnh</strong>. Muốn thêm ảnh mới, hãy <strong>xóa bớt một ảnh</strong> trước. Cấu hình đang dùng ảnh bị xóa
            vẫn giữ nguyên ảnh của nó.
          </p>
        </div>
      ) : null}

      {query.isLoading ? <p className="py-8 text-center text-sm text-muted">Đang tải album...</p> : null}
      {query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
          {getApiErrorMessage(query.error)}
        </p>
      ) : null}

      {album ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {slots.map((item, index) =>
            item ? (
              <li className="overflow-hidden rounded-xl border border-border bg-white" key={item.id}>
                <div className="relative aspect-[4/3] bg-surface-2">
                  <button
                    aria-label={`Xem trước ảnh nền ${index + 1}`}
                    className="group block h-full w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => setPreviewItem({ item, index })}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- ảnh có chữ ký riêng, không đi qua trình tối ưu của next/image */}
                    <img alt={`Ảnh nền ${index + 1}`} className="h-full w-full object-cover" decoding="async" loading="lazy" src={mediaSrc(item.url)} />
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-0.5 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <MagnifyingGlassPlus size={12} weight="bold" /> Xem trước
                    </span>
                  </button>
                  {currentAssetId === item.assetId ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                      <Check size={12} weight="bold" /> Đang dùng
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <Button onClick={() => onPick(item)} size="sm" type="button">
                    Dùng ảnh này
                  </Button>
                  <Button
                    aria-label={`Xóa ảnh nền ${index + 1}`}
                    className="text-danger"
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Xóa ảnh này khỏi album? Cấu hình đang dùng ảnh này vẫn giữ ảnh của nó.")) removeMutation.mutate(item.id);
                    }}
                    size="icon"
                    title="Xóa khỏi album"
                    type="button"
                    variant="ghost"
                  >
                    <Trash size={18} />
                  </Button>
                </div>
              </li>
            ) : (
              <li
                className={cn("flex aspect-[4/3] items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-1 text-xs text-muted")}
                key={`empty-${index}`}
              >
                Ô trống
              </li>
            ),
          )}
        </ul>
      ) : null}

      <Dialog.Root onOpenChange={(open) => !open && setPreviewItem(null)} open={previewItem !== null}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-[4px]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl focus:outline-none"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <Dialog.Title className="text-base font-semibold text-foreground">
                {previewItem ? `Xem trước ảnh nền ${previewItem.index + 1}` : "Xem trước ảnh nền"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button aria-label="Đóng xem trước" size="icon" variant="ghost">
                  <X className="h-[18px] w-[18px]" />
                </Button>
              </Dialog.Close>
            </div>
            {previewItem ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh có chữ ký riêng, không đi qua trình tối ưu của next/image
              <img alt={`Xem trước ảnh nền ${previewItem.index + 1}`} className="mx-auto block max-h-[68dvh] w-full rounded-xl border border-border object-contain" src={mediaSrc(previewItem.item.url)} />
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Đóng
                </Button>
              </Dialog.Close>
              {previewItem ? (
                <Button
                  onClick={() => {
                    onPick(previewItem.item);
                    setPreviewItem(null);
                  }}
                  type="button"
                >
                  Dùng ảnh này
                </Button>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <input
        accept="image/*"
        className="sr-only"
        data-testid="album-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) addMutation.mutate(file);
        }}
        ref={inputRef}
        type="file"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {items.length}/{max} ảnh
        </span>
        <Button disabled={!album || full || addMutation.isPending} loading={addMutation.isPending} onClick={() => inputRef.current?.click()} type="button" variant="outline">
          <UploadSimple aria-hidden className="h-4 w-4" />
          {full ? "Album đã đủ ảnh" : "Tải ảnh mới vào album"}
        </Button>
      </div>
    </div>
  );
}
