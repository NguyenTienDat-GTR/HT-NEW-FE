"use client";

import { ShieldCheck } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getApiErrorMessage } from "@/lib/api/client";
import { PRIVACY_POLICY_LINK_LABEL, PRIVACY_POLICY_PATH } from "../constants";
import { privacyApi, usePrivacyConsent } from "../privacy-api";
import { signOutAndRedirect } from "../sign-out";

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN");
}

/** Mục "Quyền riêng tư" trong hồ sơ cá nhân: xem đã đồng ý phiên bản nào, đọc chính sách, rút đồng ý (Điều 10 Luật 91/2025). */
export function PrivacySection() {
  const queryClient = useQueryClient();
  const status = usePrivacyConsent();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setPending(true);
    setError(null);
    try {
      await privacyApi.withdraw();
      // Rút đồng ý thì không còn cơ sở để tiếp tục dùng hệ thống: đăng xuất ngay.
      await signOutAndRedirect(queryClient);
    } catch (exception) {
      setError(getApiErrorMessage(exception));
      setPending(false);
    }
  }

  const data = status.data;
  return (
    <Panel className="space-y-3 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <ShieldCheck aria-hidden className="h-5 w-5" weight="bold" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Quyền riêng tư</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            {data?.consented
              ? `Bạn đã đồng ý chính sách bảo vệ dữ liệu cá nhân phiên bản ${data.consentedVersion}${data.consentedAt ? ` lúc ${formatDateTime(data.consentedAt)}` : ""}.`
              : "Chưa có xác nhận đồng ý còn hiệu lực."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={PRIVACY_POLICY_PATH} rel="noopener noreferrer" target="_blank">
            {PRIVACY_POLICY_LINK_LABEL}
          </Link>
        </Button>
        {data?.consented && !confirming ? (
          <Button onClick={() => setConfirming(true)} size="sm" variant="ghost">
            Rút đồng ý
          </Button>
        ) : null}
      </div>

      {confirming ? (
        <div className="space-y-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm leading-5 text-foreground" role="alert">
          <p>
            Rút đồng ý sẽ đăng xuất bạn và bạn phải đồng ý lại mới dùng được hệ thống. Dữ liệu đã có <strong>không tự bị xóa</strong>: muốn xóa, hãy gửi yêu
            cầu xóa theo hướng dẫn trong chính sách.
          </p>
          {error ? <p className="text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <Button loading={pending} onClick={() => void withdraw()} size="sm" variant="destructive">
              Xác nhận rút đồng ý
            </Button>
            <Button disabled={pending} onClick={() => setConfirming(false)} size="sm" variant="outline">
              Hủy
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
