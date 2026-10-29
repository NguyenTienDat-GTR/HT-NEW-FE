"use client";

import { Camera, MagnifyingGlassMinus, MagnifyingGlassPlus, UploadSimple, Warning, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { MediaImage } from "@/components/common/media-image";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { cropPortraitToFile, ImageValidationError, validateImageFile } from "@/lib/media/compress-image";
import { uploadPreparedMedia, type MediaUploadResult } from "@/lib/media/upload-media";

// Khung căn ảnh khổ 4x6 (dọc, rộng:cao = 2:3): đây chính là phần ảnh sẽ được lưu và in lên chứng nhận / thẻ.
export const FRAME_WIDTH = 240;
export const FRAME_HEIGHT = 360;
const MAX_ZOOM = 4;

type Natural = { width: number; height: number };
type Offset = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Vị trí hợp lệ: ảnh luôn phủ kín khung (không để hở mép).
function clampOffset(offset: Offset, natural: Natural, scale: number): Offset {
  return {
    x: clamp(offset.x, FRAME_WIDTH - natural.width * scale, 0),
    y: clamp(offset.y, FRAME_HEIGHT - natural.height * scale, 0),
  };
}

const coverScale = (natural: Natural) => Math.max(FRAME_WIDTH / natural.width, FRAME_HEIGHT / natural.height);

// Hộp chọn ảnh đại diện: chọn ảnh, kéo / phóng to để căn vào khung 4x6, đọc lưu ý rồi mới tải lên.
export function AvatarUploadDialog({
  open,
  onOpenChange,
  currentUrl,
  category = "LEADER_AVATAR",
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Ảnh đang dùng (nếu có) để so sánh với ảnh mới.
  currentUrl?: string | null;
  // Loại ảnh gửi lên backend: ảnh huynh trưởng (mặc định) hoặc ảnh tài khoản không gắn huynh trưởng.
  category?: "LEADER_AVATAR" | "ACCOUNT_AVATAR";
  onUploaded: (result: MediaUploadResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ startX: number; startY: number; origin: Offset } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<Natural | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Giải phóng URL tạm của ảnh đang căn.
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  function reset() {
    setFile(null);
    setSourceUrl(null);
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
    setBusy(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next && busy) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function handleFile(chosen: File) {
    setError(null);
    try {
      validateImageFile(chosen, "avatar");
    } catch (exception) {
      setError(exception instanceof ImageValidationError ? exception.message : getApiErrorMessage(exception));
      return;
    }
    setFile(chosen);
    setNatural(null);
    setZoom(1);
    setSourceUrl(URL.createObjectURL(chosen));
  }

  // Ảnh đã nạp: đặt ảnh phủ kín khung và căn giữa.
  function handleImageLoaded(width: number, height: number) {
    if (!width || !height) {
      setError("Không đọc được ảnh, tệp có thể bị hỏng hoặc không đúng định dạng");
      return;
    }
    const size = { width, height };
    const scale = coverScale(size);
    setNatural(size);
    setZoom(1);
    setOffset({ x: (FRAME_WIDTH - width * scale) / 2, y: (FRAME_HEIGHT - height * scale) / 2 });
  }

  const scale = natural ? coverScale(natural) * zoom : 1;

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

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!natural) return;
    drag.current = { startX: event.clientX, startY: event.clientY, origin: offset };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || !natural) return;
    const { startX, startY, origin } = drag.current;
    setOffset(clampOffset({ x: origin.x + event.clientX - startX, y: origin.y + event.clientY - startY }, natural, scale));
  }

  async function confirm() {
    if (!file || !natural || !imageRef.current) return;
    setBusy(true);
    setError(null);
    try {
      // Vùng ảnh gốc đang nằm trong khung 4x6.
      const cropped = await cropPortraitToFile(
        imageRef.current,
        { x: -offset.x / scale, y: -offset.y / scale, width: FRAME_WIDTH / scale, height: FRAME_HEIGHT / scale },
        file.name,
      );
      const result = await uploadPreparedMedia(cropped, category);
      onUploaded(result);
      reset();
      onOpenChange(false);
    } catch (exception) {
      setError(exception instanceof ImageValidationError ? exception.message : getApiErrorMessage(exception));
      setBusy(false);
    }
  }

  return (
    <Dialog.Root onOpenChange={handleOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl focus:outline-none sm:p-6"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Camera aria-hidden className="h-5 w-5" weight="bold" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">Chọn ảnh đại diện</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm leading-5 text-text-secondary">
                  Ảnh khổ 4x6 (dọc). Kéo ảnh và dùng thanh phóng to để căn vào khung.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" disabled={busy} size="icon" variant="ghost">
                <X className="h-[18px] w-[18px]" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900" role="note">
            <Warning aria-hidden className="mt-0.5 h-5 w-5 shrink-0" weight="fill" />
            <p>
              Ảnh đại diện <strong>có thể được in lên chứng nhận</strong>. Vui lòng chọn ảnh <strong>rõ mặt</strong>, mặc{" "}
              <strong>đúng đồng phục</strong>, <strong>đeo khăn quàng</strong> và <strong>đầu tóc gọn gàng</strong>.
            </p>
          </div>

          <div className="mt-5 grid items-start gap-5 sm:grid-cols-[auto_1fr]">
            <div className="mx-auto">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">Khung ảnh 4x6</p>
              <div
                aria-label="Khung căn ảnh 4x6"
                className="relative touch-none select-none overflow-hidden rounded-md border-2 border-primary bg-slate-100"
                data-testid="avatar-frame"
                onPointerCancel={() => (drag.current = null)}
                onPointerDown={startDrag}
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
                    onError={() => setError("Không đọc được ảnh, tệp có thể bị hỏng hoặc không đúng định dạng")}
                    onLoad={(event) => handleImageLoaded(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                    ref={imageRef}
                    src={sourceUrl}
                    style={
                      natural
                        ? { left: offset.x, top: offset.y, width: natural.width * scale, height: natural.height * scale }
                        : { visibility: "hidden" }
                    }
                  />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted">
                    <UploadSimple size={28} />
                    Chưa chọn ảnh
                  </span>
                )}
                {natural ? (
                  // Đường chia ba giúp căn mặt vào giữa khung.
                  <span aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }, (_, index) => (
                      <span className="border border-white/40" key={index} />
                    ))}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary" htmlFor="avatar-zoom">
                  Phóng to / thu nhỏ
                </label>
                <div className="flex items-center gap-2">
                  <MagnifyingGlassMinus aria-hidden className="h-4 w-4 text-muted" />
                  <input
                    aria-label="Phóng to / thu nhỏ"
                    className="w-full accent-primary"
                    disabled={!natural || busy}
                    id="avatar-zoom"
                    max={MAX_ZOOM}
                    min={1}
                    onChange={(event) => changeZoom(Number(event.target.value))}
                    step={0.05}
                    type="range"
                    value={zoom}
                  />
                  <MagnifyingGlassPlus aria-hidden className="h-4 w-4 text-muted" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ảnh hiện tại</p>
                <MediaImage
                  alt="Ảnh hiện tại"
                  className="block h-24 w-16 rounded-md border border-border"
                  fallback={
                    <span className="flex h-24 w-16 items-center justify-center rounded-md bg-surface-2 text-muted">
                      <Camera size={24} weight="duotone" />
                    </span>
                  }
                  src={currentUrl}
                />
              </div>
            </div>
          </div>

          <input
            accept="image/*"
            className="sr-only"
            data-testid="avatar-file-input"
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              event.target.value = "";
              if (chosen) handleFile(chosen);
            }}
            ref={inputRef}
            type="file"
          />

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button disabled={busy} onClick={() => inputRef.current?.click()} type="button" variant="outline">
              <UploadSimple aria-hidden className="h-4 w-4" />
              {file ? "Chọn ảnh khác" : "Chọn ảnh từ máy"}
            </Button>
            <Button disabled={!natural || busy} loading={busy} onClick={() => void confirm()} type="button">
              Dùng ảnh này
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
