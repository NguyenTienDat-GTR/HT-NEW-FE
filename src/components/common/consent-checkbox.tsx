"use client";

import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { CONTROLLER_NAME, PRIVACY_POLICY_LINK_LABEL, PRIVACY_POLICY_PATH } from "@/modules/privacy/constants";

export type ConsentVariant = "self" | "attestation";

/**
 * Ô đồng ý xử lý dữ liệu cá nhân (Luật 91/2025 Điều 9; NĐ 356/2025 khoản 3 Điều 6): không bao giờ tích sẵn, có liên kết tới chính sách,
 * nêu rõ mục đích xử lý.
 * - self: người dùng đồng ý cho dữ liệu của chính mình.
 * - attestation: quản trị viên xác nhận người có dữ liệu đã được thông báo và đồng ý khi nhập hộ.
 */
export function ConsentCheckbox({
  variant,
  checked,
  onChange,
  error,
  disabled,
  className,
}: {
  variant: ConsentVariant;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const policyLink = (
    <Link className="font-semibold text-primary underline-offset-2 hover:underline" href={PRIVACY_POLICY_PATH} rel="noopener noreferrer" target="_blank">
      {PRIVACY_POLICY_LINK_LABEL}
    </Link>
  );

  return (
    <div className={cn("rounded-lg border border-border bg-surface-1 p-3", error && "border-danger", className)}>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-foreground" htmlFor={id}>
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          checked={checked}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        {variant === "self" ? (
          <span>
            Tôi đồng ý để {CONTROLLER_NAME} xử lý họ tên, tên thánh, ngày sinh, giới tính, email, số điện thoại, giáo xứ và ảnh của tôi để quản lý hồ sơ
            huynh trưởng, đào tạo và cấp chứng nhận, theo {policyLink}.
          </span>
        ) : (
          <span>
            Tôi xác nhận người có thông tin dưới đây đã được thông báo và đồng ý để {CONTROLLER_NAME} xử lý dữ liệu cá nhân của họ để quản lý hồ sơ huynh trưởng, đào tạo và cấp chứng nhận, theo {policyLink}. Hệ thống ghi lại xác nhận này kèm thời
            điểm.
          </span>
        )}
      </label>
      {error ? (
        <p className="mt-1.5 text-xs text-danger" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
