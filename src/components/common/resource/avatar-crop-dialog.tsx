"use client";

import { MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { clamp, clampOffset, coverScale, FRAME_HEIGHT, FRAME_WIDTH, MAX_ZOOM, type Natural, type Offset } from "@/lib/media/avatar-frame";
import { cropPortraitToFile, ImageValidationError } from "@/lib/media/compress-image";

// Chỉnh tay một ảnh trong lô import: kéo / phóng to để đưa khuôn mặt vào giữa khung 4x6, không tải lên (ảnh chỉ được thay trong lô).
export function AvatarCropDialog({ blob, fileName, onCancel, onConfirm }: { blob: Blob; fileName: string; onCancel: () => void; onConfirm: (file: File) => void }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ startX: number; startY: number; origin: Offset } | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<Natural | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- blob URL phải tạo và thu hồi cùng vòng đời hộp thoại
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const scale = natural ? coverScale(natural) * zoom : 1;

  function handleLoaded(width: number, height: number) {
    if (!width || !height) {
      setError("Không đọc được ảnh");
      return;
    }
    const size = { width, height };
    const base = coverScale(size);
    setNatural(size);
    setZoom(1);
    setOffset({ x: (FRAME_WIDTH - width * base) / 2, y: (FRAME_HEIGHT - height * base) / 2 });
  }

  function changeZoom(nextZoom: number) {
    if (!natural) return;
    const next = clamp(nextZoom, 1, MAX_ZOOM);
    const nextScale = coverScale(natural) * next;
    // Giữ nguyên điểm đang ở tâm khung khi phóng to / thu nhỏ.
    const centerX = (FRAME_WIDTH / 2 - offset.x) / scale;
    const centerY = (FRAME_HEIGHT / 2 - offset.y) / scale;
    setZoom(next);
    setOffset(clampOffset({ x: FRAME_WIDTH / 2 - centerX * nextScale, y: FRAME_HEIGHT / 2 - centerY * nextScale }, natural, nextScale));
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || !natural) return;
    const { startX, startY, origin } = drag.current;
    setOffset(clampOffset({ x: origin.x + event.clientX - startX, y: origin.y + event.clientY - startY }, natural, scale));
  }

  async function confirm() {
    if (!natural || !imageRef.current) return;
    setBusy(true);
    try {
      const cropped = await cropPortraitToFile(imageRef.current, { x: -offset.x / scale, y: -offset.y / scale, width: FRAME_WIDTH / scale, height: FRAME_HEIGHT / scale }, fileName);
      onConfirm(cropped);
    } catch (exception) {
      setError(exception instanceof ImageValidationError ? exception.message : "Không cắt được ảnh");
      setBusy(false);
    }
  }

  return (
    <Dialog.Root onOpenChange={(next) => (!next && !busy ? onCancel() : undefined)} open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl focus:outline-none"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="text-lg font-semibold text-foreground">Chỉnh ảnh</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-sm text-text-secondary">
            Kéo ảnh để đưa khuôn mặt vào giữa khung, dùng thanh để phóng to. Ảnh: {fileName}
          </Dialog.Description>
          <div
            aria-label="Khung căn ảnh 4x6"
            className="relative mx-auto mt-4 touch-none select-none overflow-hidden rounded-md border-2 border-primary bg-slate-100"
            onPointerCancel={() => (drag.current = null)}
            onPointerDown={(event) => {
              if (!natural) return;
              drag.current = { startX: event.clientX, startY: event.clientY, origin: offset };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={moveDrag}
            onPointerUp={() => (drag.current = null)}
            style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, cursor: natural ? "grab" : "default" }}
          >
            {sourceUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước cục bộ (blob URL)
              <img
                alt="Ảnh đang căn chỉnh"
                className="pointer-events-none absolute max-w-none"
                draggable={false}
                onError={() => setError("Không đọc được ảnh")}
                onLoad={(event) => handleLoaded(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                ref={imageRef}
                src={sourceUrl}
                style={natural ? { left: offset.x, top: offset.y, width: natural.width * scale, height: natural.height * scale } : { visibility: "hidden" }}
              />
            ) : null}
          </div>
          <div className="mx-auto mt-4 flex items-center gap-3" style={{ width: FRAME_WIDTH }}>
            <MagnifyingGlassMinus aria-hidden className="h-4 w-4 text-muted" />
            <input
              aria-label="Phóng to"
              className="h-2 flex-1 cursor-pointer accent-[var(--primary)]"
              disabled={!natural}
              max={MAX_ZOOM}
              min={1}
              onChange={(event) => changeZoom(Number(event.target.value))}
              step={0.05}
              type="range"
              value={zoom}
            />
            <MagnifyingGlassPlus aria-hidden className="h-4 w-4 text-muted" />
          </div>
          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button disabled={busy} onClick={onCancel} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={!natural} loading={busy} onClick={() => void confirm()} type="button">
              Dùng khung này
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
