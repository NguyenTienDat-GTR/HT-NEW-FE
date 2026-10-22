"use client";

import { Key, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { passwordChangeApi } from "../account-api";
import { NewPasswordStep, OtpStep, StepIndicator, SuccessStep, VerifyStep } from "./change-password-steps";

type Step = "verify" | "otp" | "password" | "done";

const stepOrder: Step[] = ["verify", "otp", "password", "done"];
const stepLabels = ["Xác minh", "Mã OTP", "Mật khẩu mới"];
const stepDescriptions: Record<Step, string> = {
  verify: "Nhập mật khẩu hiện tại để nhận mã xác thực qua email.",
  otp: "Nhập mã gồm 6 chữ số vừa được gửi tới email của bạn.",
  password: "Tạo mật khẩu mới cho tài khoản.",
  done: "Mật khẩu của bạn đã được cập nhật.",
};

type FlowState = {
  step: Step;
  oldPassword: string;
  otp: string;
  changeToken: string;
  email: string;
  expiresAt: number | null;
  resendAt: number | null;
};

const initialState: FlowState = {
  step: "verify",
  oldPassword: "",
  otp: "",
  changeToken: "",
  email: "",
  expiresAt: null,
  resendAt: null,
};

/** Đổi mật khẩu 3 bước: mật khẩu hiện tại → OTP qua email → mật khẩu mới. Toàn bộ kiểm tra nằm ở BE. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, setState] = useState<FlowState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"send" | "resend" | "verify" | "change" | null>(null);

  function patch(next: Partial<FlowState>) {
    setState((current) => ({ ...current, ...next }));
  }

  function handleOpenChange(next: boolean) {
    if (!next && pending) return;
    if (!next) {
      setState(initialState);
      setError(null);
    }
    onOpenChange(next);
  }

  async function run<T>(kind: NonNullable<typeof pending>, action: () => Promise<T>, onSuccess: (result: T) => void) {
    setPending(kind);
    setError(null);
    try {
      onSuccess(await action());
    } catch (exception) {
      setError(getApiErrorMessage(exception));
    } finally {
      setPending(null);
    }
  }

  function sendOtp(kind: "send" | "resend") {
    void run(kind, () => passwordChangeApi.sendOtp(state.oldPassword), (result) => {
      const now = Date.now();
      patch({
        step: "otp",
        otp: "",
        email: result.email,
        expiresAt: now + result.expiresInSeconds * 1000,
        resendAt: now + result.resendAfterSeconds * 1000,
      });
      if (kind === "resend") toast.success(`Đã gửi lại mã OTP tới ${result.email}`);
    });
  }

  function verifyOtp(otp: string) {
    void run("verify", () => passwordChangeApi.verifyOtp(otp), (result) => {
      patch({ step: "password", changeToken: result.changeToken, otp: "" });
    });
  }

  function changePassword(newPassword: string, confirmPassword: string) {
    void run("change", () => passwordChangeApi.change(state.changeToken, newPassword, confirmPassword), () => {
      patch({ step: "done", oldPassword: "", changeToken: "" });
      toast.success("Đổi mật khẩu thành công");
    });
  }

  const stepIndex = stepOrder.indexOf(state.step);

  return (
    <Dialog.Root onOpenChange={handleOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[4px] motion-safe:data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl focus:outline-none sm:p-6"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Key aria-hidden className="h-5 w-5" weight="bold" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">Đổi mật khẩu</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm leading-5 text-text-secondary">
                  {stepDescriptions[state.step]}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" disabled={Boolean(pending)} size="icon" variant="ghost">
                <X className="h-[18px] w-[18px]" />
              </Button>
            </Dialog.Close>
          </div>

          {state.step !== "done" ? (
            <div className="my-5">
              <StepIndicator current={stepIndex} steps={stepLabels} />
            </div>
          ) : (
            <div className="h-4" />
          )}

          {state.step === "verify" ? (
            <VerifyStep
              error={error}
              loading={pending === "send"}
              oldPassword={state.oldPassword}
              onSubmit={() => sendOtp("send")}
              setOldPassword={(oldPassword) => patch({ oldPassword })}
            />
          ) : null}
          {state.step === "otp" ? (
            <OtpStep
              error={error}
              expiresAt={state.expiresAt}
              loading={pending === "verify"}
              email={state.email}
              onBack={() => {
                setError(null);
                patch({ step: "verify", otp: "" });
              }}
              onResend={() => sendOtp("resend")}
              onSubmit={verifyOtp}
              otp={state.otp}
              resendAt={state.resendAt}
              resending={pending === "resend"}
              setOtp={(otp) => {
                if (error) setError(null);
                patch({ otp });
              }}
            />
          ) : null}
          {state.step === "password" ? (
            <NewPasswordStep error={error} loading={pending === "change"} oldPassword={state.oldPassword} onSubmit={changePassword} />
          ) : null}
          {state.step === "done" ? <SuccessStep onClose={() => handleOpenChange(false)} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
