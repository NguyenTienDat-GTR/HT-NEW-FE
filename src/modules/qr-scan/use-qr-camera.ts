"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

// Camera quét QR dùng chung cho trình quét điểm danh / chứng nhận: mở camera sau, đọc từng khung hình bằng jsQR.
// `active` = false thì vẫn giữ camera nhưng không đọc (ví dụ đang chờ người dùng xác nhận). Ảnh QR chọn từ máy qua `scanImage`.
export function useQrCamera({ onText, onImageError, active = true }: { onText: (text: string) => void; onImageError: (message: string) => void; active?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const onTextRef = useRef(onText);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    activeRef.current = active;
    onTextRef.current = onText;
  }, [active, onText]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Trình duyệt không hỗ trợ camera (cần HTTPS). Có thể dùng súng quét, dán mã hoặc chọn ảnh bên dưới.");
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
        setCameraError("Không mở được camera. Hãy cấp quyền camera hoặc dùng súng quét / dán mã / chọn ảnh bên dưới.");
        setStarting(false);
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (cancelled) return;
      if (video && canvas && activeRef.current && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
          if (result?.data) onTextRef.current(result.data);
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
  }, []);

  const scanImage = useCallback(
    (file: File) => {
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
        if (!result?.data) onImageError("Không tìm thấy mã QR trong ảnh.");
        else onTextRef.current(result.data);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        onImageError("Không đọc được ảnh đã chọn.");
      };
      image.src = url;
    },
    [onImageError],
  );

  return { videoRef, canvasRef, starting, cameraError, scanImage };
}
