"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle, ImageSquare, QrCode, Warning, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { certificateDetailHref } from "@/modules/certificates/scan-utils";
import { classifyScan } from "@/modules/qr-scan/scan-payload";
import { useQrCamera } from "@/modules/qr-scan/use-qr-camera";
import { lookupAttendance, participantKeys, scanAttendance } from "../api";
import { explainRejectedScan, LEGACY_ATTENDANCE_MESSAGE } from "../attendance-token";
import { INITIAL_SCAN_FLOW, scanFlowReducer } from "../scan-flow";
import { markScanned, shouldProcessScan, type ScanGateState } from "../scan-gate";

// Quét mã QR: quét -> hiện người được quét -> người dùng bấm "Xác nhận điểm danh" (hoặc "Bỏ qua") -> thành công thì "Quét tiếp".
// Camera chỉ đọc khi đang chờ quét; có thể dùng súng quét USB, dán mã hoặc chọn ảnh.
// - Có `courseCode` (trang điểm danh của một khóa): chỉ nhận mã điểm danh đúng khóa đó.
// - Không có `courseCode` (nút quét ở header): nhận cả mã điểm danh (khóa lấy từ chính mã) lẫn mã chứng nhận; chứng nhận được mở thẳng trang chi tiết.
export function AttendanceScannerDialog({ courseCode, courseName, open, onOpenChange }: { courseCode?: string; courseName?: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const universal = !courseCode;
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-elevated)] focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[92vh] sm:w-[min(94vw,560px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-border sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-foreground">{universal ? "Quét mã QR" : "Điểm danh bằng mã QR"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                {courseName ? <span className="font-medium text-foreground">{courseName}. </span> : null}
                {universal
                  ? "Quét mã QR trên thẻ tham dự để điểm danh, hoặc mã QR trên chứng nhận để mở trang chi tiết chứng nhận."
                  : "Đưa mã QR trên thẻ hoặc trong email vào khung hình, kiểm tra người được quét rồi bấm xác nhận."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          {open ? <Scanner courseCode={courseCode} onClose={() => onOpenChange(false)} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Scanner({ courseCode, onClose }: { courseCode?: string; onClose: () => void }) {
  const universal = !courseCode;
  const queryClient = useQueryClient();
  const router = useRouter();
  const gate = useRef<ScanGateState>(null);
  const [flow, dispatch] = useReducer(scanFlowReducer, INITIAL_SCAN_FLOW);
  const flowRef = useRef(flow);
  useEffect(() => {
    flowRef.current = flow;
  }, [flow]);
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
      await queryClient.invalidateQueries({ queryKey: courseCode ? participantKeys.all(courseCode) : ["course-participants"] });
    },
    onError: (error) => dispatch({ type: "failed", message: getApiErrorMessage(error) }),
  });
  // Chứng nhận: kiểm tra tồn tại trước; không có thì báo lỗi ngay ở khung quét, có (kể cả đã thu hồi) thì sang trang chi tiết.
  const certificate = useMutation({
    mutationFn: async (code: string) => ({ code, detail: await apiFetch<Record<string, unknown>>(`/certificates/${encodeURIComponent(code)}`) }),
    onSuccess: ({ code, detail }) => {
      queryClient.setQueryData(["resource-detail", "/certificates", code], detail);
      onClose();
      router.push(certificateDetailHref(code) as never);
    },
    onError: (error, code) => {
      const status = (error as { status?: number }).status;
      dispatch({ type: "failed", message: status === 404 ? `Không tìm thấy chứng nhận ${code}. Hãy kiểm tra lại mã QR.` : getApiErrorMessage(error) });
    },
  });
  const { mutate: doLookup } = lookup;
  const { mutate: doCertificate } = certificate;

  // Chỉ nhận mã khi đang chờ quét; mã điểm danh được tra cứu rồi chờ người dùng xác nhận, mã chứng nhận chuyển thẳng sang chi tiết.
  const handleText = useCallback(
    (raw: string) => {
      if (flowRef.current.step !== "scanning") return;
      const now = Date.now();
      const payload = classifyScan(raw);
      const key = payload.kind === "attendance" ? payload.token : payload.kind === "certificate" ? payload.code : raw.trim();
      if (!key || !shouldProcessScan(key, now, gate.current)) return;
      gate.current = markScanned(key, now);

      if (payload.kind === "attendance" || (payload.kind === "certificate" && universal)) {
        flowRef.current = { step: "looking", token: key };
        dispatch({ type: "scanned", token: key });
        if (payload.kind === "attendance") doLookup(payload.token);
        else doCertificate(payload.code);
        return;
      }
      const message = payload.kind === "legacy-attendance" ? LEGACY_ATTENDANCE_MESSAGE : explainRejectedScan(raw);
      dispatch({ type: "failed", message: universal && payload.kind === "unknown" ? "Mã QR không phải mã điểm danh hay mã chứng nhận của hệ thống." : message });
    },
    [doCertificate, doLookup, universal],
  );

  const onImageError = useCallback((message: string) => dispatch({ type: "failed", message }), []);
  const { videoRef, canvasRef, starting, cameraError, scanImage } = useQrCamera({ onText: handleText, onImageError, active: flow.step === "scanning" });

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) scanImage(file);
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
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-900 sm:aspect-video">
            <video className="h-full w-full object-cover" muted playsInline ref={videoRef} />
            <canvas className="hidden" ref={canvasRef} />
            {starting ? <div className="absolute inset-0 grid place-items-center text-sm text-white/80">Đang mở camera…</div> : null}
            {flow.step === "looking" ? <div className="absolute inset-0 grid place-items-center bg-slate-900/60 text-sm text-white">Đang kiểm tra mã…</div> : null}
            <div className="pointer-events-none absolute inset-[16%] rounded-xl border-2 border-white/80" />
          </div>
          {cameraError ? <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">{cameraError}</p> : null}
          <form className="flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={submitManual}>
            <div className="relative min-w-0 flex-1">
              <QrCode aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input aria-label="Mã điểm danh" autoComplete="off" className="pl-9" onChange={(event) => setManual(event.target.value)} placeholder="Súng quét USB hoặc dán mã rồi nhấn Enter" value={manual} />
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary sm:min-h-10">
              <ImageSquare size={16} /> Chọn ảnh
              <input accept="image/*" className="sr-only" onChange={pickFile} type="file" />
            </label>
          </form>
        </>
      ) : null}

      {flow.step === "confirm" || flow.step === "confirming" ? (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-4" role="status">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Xác nhận điểm danh</p>
          <p className="text-lg font-bold text-foreground">{name}</p>
          {place ? <p className="text-sm text-text-secondary">{place}</p> : null}
          {universal && person?.courseName ? <p className="text-sm font-medium text-foreground">Khóa: {person.courseName}</p> : null}
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
                {[
                  universal ? person?.courseName : "",
                  place,
                  person?.checkedInAt ? `lúc ${new Date(person.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : "",
                ].filter(Boolean).join(" · ")}
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
