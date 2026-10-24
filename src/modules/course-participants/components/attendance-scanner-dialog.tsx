"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle, ImageSquare, QrCode, Warning, X } from "@phosphor-icons/react";
import jsQR from "jsqr";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { lookupAttendance, participantKeys, scanAttendance } from "../api";
import { attendanceTokenFromScan, explainRejectedScan } from "../attendance-token";
import { INITIAL_SCAN_FLOW, scanFlowReducer } from "../scan-flow";
import { markScanned, shouldProcessScan, type ScanGateState } from "../scan-gate";

// Quét mã QR điểm danh: quét -> hiện người được quét -> người dùng bấm "Xác nhận điểm danh" (hoặc "Bỏ qua") -> thành công thì "Quét tiếp".
// Camera chỉ đọc khi đang chờ quét; có thể dùng súng quét USB, dán mã hoặc chọn ảnh.
export function AttendanceScannerDialog({ courseCode, courseName, open, onOpenChange }: { courseCode: string; courseName?: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Điểm danh bằng mã QR</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                {courseName ? <span className="font-medium text-foreground">{courseName}. </span> : null}
                Đưa mã QR trên thẻ hoặc trong email vào khung hình, kiểm tra người được quét rồi bấm xác nhận.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          {open ? <Scanner courseCode={courseCode} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Scanner({ courseCode }: { courseCode: string }) {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gate = useRef<ScanGateState>(null);
  const [flow, dispatch] = useReducer(scanFlowReducer, INITIAL_SCAN_FLOW);
  const flowRef = useRef(flow);
  useEffect(() => {
    flowRef.current = flow;
  }, [flow]);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const lookup = useMutation({
    mutationFn: (token: string) => lookupAttendance(courseCode, token),
    onSuccess: (person) => dispatch({ type: "looked-up", person }),
    onError: (error) => dispatch({ type: "failed", message: getApiErrorMessage(error) }),
  });
  const confirm = useMutation({
    mutationFn: (token: string) => scanAttendance(courseCode, token),
    onSuccess: async (person) => {
      dispatch({ type: "confirmed", person });
      await queryClient.invalidateQueries({ queryKey: participantKeys.all(courseCode) });
    },
    onError: (error) => dispatch({ type: "failed", message: getApiErrorMessage(error) }),
  });
  const { mutate: doLookup } = lookup;

  // Chỉ nhận mã khi đang chờ quét; mã đọc được sẽ được tra cứu rồi chờ người dùng xác nhận.
  const handleText = useCallback(
    (raw: string) => {
      if (flowRef.current.step !== "scanning") return;
      const token = attendanceTokenFromScan(raw);
      const now = Date.now();
      if (!token) {
        if (shouldProcessScan(raw.trim(), now, gate.current)) {
          gate.current = markScanned(raw.trim(), now);
          dispatch({ type: "failed", message: explainRejectedScan(raw) });
        }
        return;
      }
      if (!shouldProcessScan(token, now, gate.current)) return;
      gate.current = markScanned(token, now);
      flowRef.current = { step: "looking", token };
      dispatch({ type: "scanned", token });
      doLookup(token);
    },
    [doLookup],
  );

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
      if (video && canvas && flowRef.current.step === "scanning" && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
          if (result?.data) handleText(result.data);
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
      if (!result?.data) dispatch({ type: "failed", message: "Không tìm thấy mã QR trong ảnh." });
      else handleText(result.data);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      dispatch({ type: "failed", message: "Không đọc được ảnh đã chọn." });
    };
    image.src = url;
  }

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    const value = manual;
    setManual("");
    if (!value.trim()) return;
    gate.current = null;
    handleText(value);
  }

  const person = "person" in flow ? flow.person : null;
  const name = person ? [person.holyName, person.fullName].filter(Boolean).join(" ") : "";
  const place = person ? [person.teamName, person.parishName].filter(Boolean).join(" · ") : "";
  const showCamera = flow.step === "scanning" || flow.step === "looking";

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {showCamera ? (
        <>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
            <video className="h-full w-full object-cover" muted playsInline ref={videoRef} />
            <canvas className="hidden" ref={canvasRef} />
            {starting ? <div className="absolute inset-0 grid place-items-center text-sm text-white/80">Đang mở camera…</div> : null}
            {flow.step === "looking" ? <div className="absolute inset-0 grid place-items-center bg-slate-900/60 text-sm text-white">Đang kiểm tra mã…</div> : null}
            <div className="pointer-events-none absolute inset-[16%] rounded-xl border-2 border-white/80" />
          </div>
          {cameraError ? <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">{cameraError}</p> : null}
          <form className="flex items-center gap-2" onSubmit={submitManual}>
            <div className="relative min-w-0 flex-1">
              <QrCode aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input aria-label="Mã điểm danh" autoComplete="off" className="pl-9" onChange={(event) => setManual(event.target.value)} placeholder="Súng quét USB hoặc dán mã rồi nhấn Enter" value={manual} />
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary">
              <ImageSquare size={16} /> Chọn ảnh
              <input accept="image/*" className="sr-only" onChange={scanFile} type="file" />
            </label>
          </form>
        </>
      ) : null}

      {flow.step === "confirm" || flow.step === "confirming" ? (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-4" role="status">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Xác nhận điểm danh</p>
          <p className="text-lg font-bold text-foreground">{name}</p>
          {place ? <p className="text-sm text-text-secondary">{place}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              loading={flow.step === "confirming"}
              onClick={() => {
                dispatch({ type: "confirm" });
                confirm.mutate(flow.token);
              }}
              type="button"
            >
              <CheckCircle size={16} /> Xác nhận điểm danh
            </Button>
            <Button disabled={flow.step === "confirming"} onClick={() => dispatch({ type: "skip" })} type="button" variant="outline">
              Bỏ qua
            </Button>
          </div>
        </div>
      ) : null}

      {flow.step === "done" || flow.step === "already" ? (
        <div className={cn("space-y-3 rounded-xl border p-4", flow.step === "done" ? "border-success/30 bg-success/10" : "border-warning/40 bg-warning/10")} role="status">
          <div className="flex items-start gap-2.5">
            <CheckCircle className={flow.step === "done" ? "text-success" : "text-warning"} size={22} weight="fill" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{flow.step === "done" ? `${name} đã điểm danh thành công` : `${name} đã điểm danh trước đó`}</p>
              <p className="text-[13px] text-text-secondary">
                {[place, person?.checkedInAt ? `lúc ${new Date(person.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <Button onClick={() => dispatch({ type: "next" })} type="button">
            <ArrowRight size={16} /> Quét tiếp
          </Button>
        </div>
      ) : null}

      {flow.step === "error" ? (
        <div className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4" role="alert">
          <div className="flex items-start gap-2.5">
            <Warning className="shrink-0 text-danger" size={22} weight="fill" />
            <p className="text-sm font-semibold text-foreground">{flow.message}</p>
          </div>
          <Button onClick={() => dispatch({ type: "next" })} type="button">
            <ArrowRight size={16} /> Quét tiếp
          </Button>
        </div>
      ) : null}
    </div>
  );
}
