"use client";

import { useState, type ReactNode } from "react";
import { Tip } from "@/components/ui/tip";
import { AttendanceScannerDialog } from "@/modules/course-participants/components/attendance-scanner-dialog";

// Nút quét mã QR ngay trong trang chứng nhận: dùng chung trình quét với nút ở header
// (quét chứng nhận thì mở thẳng trang chi tiết, chứng nhận không tồn tại thì báo lỗi tại chỗ).
export function CertificateScanDialog({ trigger, tip }: { trigger: ReactNode; tip?: string }) {
  const [open, setOpen] = useState(false);
  const button = (
    <span className="inline-flex" onClickCapture={() => setOpen(true)}>
      {trigger}
    </span>
  );
  return (
    <>
      {tip ? <Tip label={tip}>{button}</Tip> : button}
      <AttendanceScannerDialog onOpenChange={setOpen} open={open} />
    </>
  );
}
