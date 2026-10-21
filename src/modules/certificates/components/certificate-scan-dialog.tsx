"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ImageSquare, X } from "@phosphor-icons/react";
import jsQR from "jsqr";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { certificateCodeFromQr, certificateDetailHref } from "../scan-utils";

// Quét mã QR chứng nhận bằng camera (hoặc chọn ảnh có mã QR) rồi chuyển tới trang chi tiết chứng nhận.
export function CertificateScanDialog({ trigger, tip }: { trigger: ReactNode; tip?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {tip ? (
        <Tip label={tip}>
          <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        </Tip>
      ) : (
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Quét mã QR chứng nhận</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Đưa mã QR trên chứng nhận vào khung hình, hệ thống sẽ mở trang chi tiết chứng nhận.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          {open ? <Scanner onDone={() => setOpen(false)} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Scanner({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const handleText = useCallback(
    (text: string) => {
      if (handled.current) return false;
      const code = certificateCodeFromQr(text);
      if (!code) {
        setError("Mã QR không phải của chứng nhận. Hãy thử lại.");
        return false;
      }
      handled.current = true;
      onDone();
      router.push(certificateDetailHref(code) as never);
      return true;
    },
    [onDone, router],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Trình duyệt không hỗ trợ camera (cần HTTPS). Bạn có thể chọn ảnh chứa mã QR bên dưới.");
        setStarting(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStarting(false);
        tick();
      } catch {
        setError("Không mở được camera. Hãy cấp quyền camera hoặc chọn ảnh chứa mã QR bên dưới.");
        setStarting(false);
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (cancelled || !video || !canvas) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
          if (result?.data && handleText(result.data)) return;
        }
      }
      frame = requestAnimationFrame(tick);
    }

    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [handleText]);

  function scanFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(image, 0, 0);
      const data = context?.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const result = data ? jsQR(data.data, data.width, data.height) : null;
      if (!result?.data) setError("Không tìm thấy mã QR trong ảnh.");
      else handleText(result.data);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Không đọc được ảnh đã chọn.");
    };
    image.src = url;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-900">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {starting ? <div className="absolute inset-0 grid place-items-center text-sm text-white/80">Đang mở camera…</div> : null}
        <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/80" />
      </div>
      {error ? <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p> : null}
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary">
        <ImageSquare size={16} /> Chọn ảnh chứa mã QR
        <input accept="image/*" className="sr-only" onChange={scanFile} type="file" />
      </label>
    </div>
  );
}
