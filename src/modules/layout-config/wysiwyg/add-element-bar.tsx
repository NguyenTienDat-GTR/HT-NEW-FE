"use client";

import { QrCode, TextT, UserCircle } from "@phosphor-icons/react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Tip } from "@/components/ui/tip";
import type { LayoutItem } from "@/modules/certificates/components/certificate-design";
import { TemplatePicker } from "./layout-sidebar";
import type { LayoutTemplate } from "./layout-templates";

// Phải nhận ref và các thuộc tính từ tooltip (Radix gắn qua asChild) thì tooltip mới hiện khi rê chuột / focus.
const IconAdd = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function IconAdd({ children, ...props }, ref) {
  return (
    <button
      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-input bg-white text-foreground shadow-sm hover:bg-slate-50 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      ref={ref}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
});

// Nút thêm phần tử (văn bản, ảnh huynh trưởng, mã QR) và chọn mẫu bố cục, đặt đầu thanh công cụ để cột trái dành hết chiều cao cho danh sách.
export function AddElementBar({
  onAddText,
  onAddPhoto,
  onAddQr,
  photoHint,
  qrHint,
  templates,
  onApplyTemplate,
  hasContent,
}: {
  onAddText: () => void;
  onAddPhoto: () => void;
  onAddQr: () => void;
  photoHint: string;
  qrHint: string;
  templates: LayoutTemplate[];
  onApplyTemplate: (items: LayoutItem[]) => void;
  hasContent: boolean;
}) {
  return (
    <>
      <Tip label="Thêm văn bản (phím T), hoặc nhấp đúp vào chỗ trống trên khung">
        <IconAdd aria-label="Thêm văn bản" onClick={onAddText}>
          <TextT size={17} />
        </IconAdd>
      </Tip>
      <Tip label={photoHint}>
        <IconAdd aria-label="Thêm ảnh huynh trưởng" onClick={onAddPhoto}>
          <UserCircle size={17} />
        </IconAdd>
      </Tip>
      <Tip label={qrHint}>
        <IconAdd aria-label="Thêm mã QR" onClick={onAddQr}>
          <QrCode size={17} />
        </IconAdd>
      </Tip>
      <TemplatePicker compact hasContent={hasContent} onApply={onApplyTemplate} templates={templates} />
    </>
  );
}
