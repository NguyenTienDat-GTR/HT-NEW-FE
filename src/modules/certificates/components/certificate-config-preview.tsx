"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api/client";
import { CertificateCanvas, formFromConfig, paperAspect, sampleValue, type ConfigResponse } from "./certificate-design";

// Xem trước bố cục cấu hình (ảnh nền + các trường với dữ liệu mẫu) khi rê chuột vào cấu hình.
// Chi tiết (ảnh nền + bố cục) chỉ được tải lúc rê chuột vào lần đầu, sau đó dùng lại từ cache.
export function ConfigPreviewTip({
  config,
  fieldLabel,
  children,
}: {
  config: ConfigResponse;
  fieldLabel: (key?: string) => string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const detail = useQuery({
    queryKey: ["certificate-config", "detail", config.id],
    enabled: open,
    staleTime: 60_000,
    queryFn: () => apiFetch<ConfigResponse>(`/certificates/config/${config.id}`),
  });
  const form = detail.data ? formFromConfig(detail.data) : null;

  return (
    <Tooltip.Root delayDuration={350} onOpenChange={setOpen} open={open}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-[60] w-[360px] max-w-[90vw] rounded-lg border border-border bg-white p-2.5 shadow-[var(--shadow-card)]"
          collisionPadding={12}
          side="right"
          sideOffset={10}
        >
          <p className="mb-1.5 truncate text-xs font-semibold text-foreground">{config.name}</p>
          {form ? (
            <>
              <CertificateCanvas
                aspect={paperAspect(form.paperSize, form.orientation)}
                backgroundImage={form.backgroundImage}
                editable={false}
                fieldLabel={fieldLabel}
                layout={form.layout}
                onMove={() => undefined}
                onSelect={() => undefined}
                preview
                sampleValue={(key) => sampleValue(key, fieldLabel)}
                selectedIndex={null}
              />
              <p className="mt-1.5 text-[11px] text-muted">
                {form.paperSize} · {form.orientation === "PORTRAIT" ? "Dọc" : "Ngang"} · {form.layout.length} phần tử · dữ liệu mẫu
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-xs text-muted">{detail.isError ? "Không tải được bố cục" : "Đang tải bố cục…"}</p>
          )}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
