"use client";

import { EnvelopeSimple, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/client";
import { emailApi, myProfileQueryKey } from "../account-api";
import { FormError } from "./change-password-steps";
import { PasswordField } from "./password-field";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Tài khoản không gắn Huynh Trưởng tự đổi email nhận OTP; BE yêu cầu nhập đúng mật khẩu hiện tại. */
export function ChangeEmailDialog({
  currentEmail,
  open,
  onOpenChange,
}: {
  currentEmail: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const trimmed = email.trim();
  const emailInvalid = trimmed.length > 0 && !EMAIL_PATTERN.test(trimmed);
  const unchanged = trimmed.length > 0 && trimmed.toLowerCase() === (currentEmail ?? "").toLowerCase();
  const canSubmit = trimmed.length > 0 && !emailInvalid && !unchanged && password.length > 0;

  function handleOpenChange(next: boolean) {
    if (!next && pending) return;
    if (!next) {
      setEmail("");
      setPassword("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await emailApi.update(trimmed, password);
      await queryClient.invalidateQueries({ queryKey: myProfileQueryKey });
      toast.success("Đã cập nhật email");
      handleOpenChange(false);
    } catch (exception) {
      setError(getApiErrorMessage(exception));
    } finally {
      setPending(false);
    }
  }

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
                <EnvelopeSimple aria-hidden className="h-5 w-5" weight="bold" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">Đổi email</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm leading-5 text-text-secondary">
                  Email này nhận mã OTP khi đổi hoặc quên mật khẩu.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" disabled={pending} size="icon" variant="ghost">
                <X className="h-[18px] w-[18px]" />
              </Button>
            </Dialog.Close>
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div>
              <label className="block text-sm font-semibold text-foreground" htmlFor="new-email">
                Email mới
              </label>
              <Input
                aria-invalid={emailInvalid || unchanged}
                autoComplete="email"
                autoFocus
                className="mt-1.5 h-11"
                id="new-email"
                maxLength={100}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={currentEmail ?? "ten@example.com"}
                type="email"
                value={email}
              />
              {emailInvalid ? <p className="mt-1 text-xs text-danger">Email không hợp lệ</p> : null}
              {unchanged ? <p className="mt-1 text-xs text-danger">Email mới trùng với email hiện tại</p> : null}
            </div>
            <PasswordField autoComplete="current-password" label="Mật khẩu hiện tại" onChange={setPassword} value={password} />
            <FormError message={error} />
            <Button className="w-full" disabled={!canSubmit} loading={pending} size="lg" type="submit">
              Lưu email
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
