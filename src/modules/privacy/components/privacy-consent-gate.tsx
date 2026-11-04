"use client";

import { ShieldCheck } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConsentCheckbox } from "@/components/common/consent-checkbox";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { privacyApi, privacyConsentQueryKey, usePrivacyConsent } from "../privacy-api";
import { signOutAndRedirect } from "../sign-out";

/**
 * Cổng đồng ý sau đăng nhập: chưa đồng ý chính sách hiện hành (hoặc đã rút) thì chặn bằng hộp thoại cho tới khi tích đồng ý.
 * Không tải được trạng thái (lỗi mạng, BE cũ) thì không chặn: BE vẫn là nơi lưu bằng chứng và kiểm soát các form.
 */
export function PrivacyConsentGate() {
  const queryClient = useQueryClient();
  const status = usePrivacyConsent();
  const [checked, setChecked] = useState(false);
  const [showError, setShowError] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!status.data || status.data.consented) return null;

  async function accept() {
    if (!checked) {
      setShowError(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = await privacyApi.accept();
      queryClient.setQueryData([...privacyConsentQueryKey, useAuthStore.getState().user?.username], next);
    } catch (exception) {
      setError(getApiErrorMessage(exception));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-[4px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[540px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl focus:outline-none sm:p-6"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <ShieldCheck aria-hidden className="h-5 w-5" weight="bold" />
            </span>
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Đồng ý chính sách bảo vệ dữ liệu cá nhân</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm leading-5 text-text-secondary">
                Để tiếp tục dùng hệ thống, vui lòng đọc và xác nhận cách chúng tôi xử lý dữ liệu cá nhân của bạn.
                {status.data.consentedVersion
                  ? " Chính sách đã được cập nhật nên cần xác nhận lại."
                  : ""}
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <ConsentCheckbox
              checked={checked}
              error={showError && !checked ? "Vui lòng tích đồng ý để tiếp tục" : null}
              onChange={(value) => {
                setChecked(value);
                if (value) setShowError(false);
              }}
              variant="self"
            />
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button disabled={pending} onClick={() => void signOutAndRedirect(queryClient)} type="button" variant="outline">
                Đăng xuất
              </Button>
              <Button loading={pending} onClick={() => void accept()} type="button">
                Đồng ý và tiếp tục
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
