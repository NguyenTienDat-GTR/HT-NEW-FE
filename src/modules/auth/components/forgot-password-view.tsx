"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand/brand-mark";
import { getApiErrorMessage } from "@/lib/api/client";
import { NewPasswordStep, OtpStep, StepIndicator } from "@/modules/account/components/change-password-steps";
import { forgotPasswordApi } from "../forgot-password-api";
import { AuthShell } from "./auth-shell";
import { ForgotPasswordDoneStep, UsernameStep } from "./forgot-password-steps";

type Step = "username" | "otp" | "password" | "done";

const stepOrder: Step[] = ["username", "otp", "password", "done"];
const stepLabels = ["Tài khoản", "Mã OTP", "Mật khẩu mới"];
const stepDescriptions: Record<Step, string> = {
  username: "Nhập tên đăng nhập để nhận mã xác thực qua email.",
  otp: "Nhập mã gồm 6 chữ số vừa được gửi tới email của bạn.",
  password: "Tạo mật khẩu mới cho tài khoản.",
  done: "Mật khẩu của bạn đã được cập nhật.",
};

type FlowState = {
  step: Step;
  username: string;
  otp: string;
  resetToken: string;
  maskedEmail: string;
  expiresAt: number | null;
  resendAt: number | null;
};

const initialState: FlowState = {
  step: "username",
  username: "",
  otp: "",
  resetToken: "",
  maskedEmail: "",
  expiresAt: null,
  resendAt: null,
};

/** Quên mật khẩu 3 bước: tên đăng nhập → OTP qua email (hiển thị dạng che ***) → mật khẩu mới. Mọi kiểm tra chính nằm ở BE. */
export function ForgotPasswordView() {
  const [state, setState] = useState<FlowState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"send" | "resend" | "verify" | "reset" | null>(null);

  function patch(next: Partial<FlowState>) {
    setState((current) => ({ ...current, ...next }));
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
    const username = state.username.trim();
    void run(kind, () => forgotPasswordApi.sendOtp(username), (result) => {
      const now = Date.now();
      patch({
        step: "otp",
        username,
        otp: "",
        maskedEmail: result.maskedEmail,
        expiresAt: now + result.expiresInSeconds * 1000,
        resendAt: now + result.resendAfterSeconds * 1000,
      });
      if (kind === "resend") toast.success(`Đã gửi lại mã OTP tới ${result.maskedEmail}`);
    });
  }

  function verifyOtp(otp: string) {
    void run("verify", () => forgotPasswordApi.verifyOtp(state.username, otp), (result) => {
      patch({ step: "password", resetToken: result.resetToken, otp: "" });
    });
  }

  function resetPassword(newPassword: string, confirmPassword: string) {
    void run("reset", () => forgotPasswordApi.reset(state.username, state.resetToken, newPassword, confirmPassword), () => {
      patch({ step: "done", resetToken: "", otp: "" });
      toast.success("Đặt lại mật khẩu thành công");
    });
  }

  function restart() {
    setError(null);
    patch({ step: "username", otp: "", resetToken: "" });
  }

  const stepIndex = stepOrder.indexOf(state.step);

  return (
    <AuthShell maxWidth="max-w-[520px]">
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandMark className="justify-center" size={72} />
        <h1 className="mt-5 text-xl font-semibold text-foreground">Quên mật khẩu</h1>
        <p className="mt-1 text-sm leading-5 text-text-secondary">{stepDescriptions[state.step]}</p>
      </div>

      {state.step !== "done" ? (
        <div className="mb-5">
          <StepIndicator current={stepIndex} steps={stepLabels} />
        </div>
      ) : null}

      {state.step === "username" ? (
        <UsernameStep
          error={error}
          loading={pending === "send"}
          onChange={(username) => {
            if (error) setError(null);
            patch({ username });
          }}
          onSubmit={() => sendOtp("send")}
          username={state.username}
        />
      ) : null}
      {state.step === "otp" ? (
        <OtpStep
          email={state.maskedEmail}
          error={error}
          expiresAt={state.expiresAt}
          loading={pending === "verify"}
          onBack={restart}
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
        <>
          <NewPasswordStep error={error} loading={pending === "reset"} onSubmit={resetPassword} submitLabel="Đặt lại mật khẩu" />
          {error ? (
            <button className="mt-3 w-full cursor-pointer text-center text-sm font-semibold text-primary hover:underline" onClick={restart} type="button">
              Gửi mã OTP khác
            </button>
          ) : null}
        </>
      ) : null}
      {state.step === "done" ? <ForgotPasswordDoneStep /> : null}
    </AuthShell>
  );
}
