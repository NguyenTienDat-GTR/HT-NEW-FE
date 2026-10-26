"use client";

import { QrCode } from "@phosphor-icons/react";
import { useState } from "react";
import { Tip } from "@/components/ui/tip";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { AttendanceScannerDialog } from "@/modules/course-participants/components/attendance-scanner-dialog";

// Nút quét QR ở header (mọi kích thước màn hình): một trình quét chung cho mã điểm danh và mã chứng nhận.
// Hiện khi tài khoản có quyền quét điểm danh (không bị khóa đơn vị) hoặc quyền xem chứng nhận; quyền từng loại mã do BE kiểm tra khi quét.
export function HeaderScanButton() {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const canScanAttendance = hasPermissionPrefix(user, "training.attendance.scan.") && !user?.unitLocked;
  const canReadCertificates = hasPermissionPrefix(user, "training.certificate.read.");
  if (!canScanAttendance && !canReadCertificates) return null;

  return (
    <>
      <Tip label="Quét mã QR điểm danh / chứng nhận">
        <button
          aria-label="Quét mã QR"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:h-10 sm:w-10"
          onClick={() => setOpen(true)}
          type="button"
        >
          <QrCode size={22} />
        </button>
      </Tip>
      <AttendanceScannerDialog onOpenChange={setOpen} open={open} />
    </>
  );
}
