"use client";

import { ArrowLeft, Certificate as CertificateIcon, QrCode } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useCertificateFonts } from "./certificate-design";
import { CertificateDetailBody, useCertificateDetail } from "./certificate-detail-drawer";
import { CertificateScanDialog } from "./certificate-scan-dialog";

// Trang chi tiết chứng nhận (đích khi quét mã QR): cùng thông tin như drawer nhưng bố cục 2 cột rộng rãi.
// Yêu cầu đăng nhập (AuthGate) và quyền xem chứng nhận; BE kiểm tra phạm vi dữ liệu theo từng chứng nhận.
export function CertificateDetailPage({ code, listPath = "/certificates" }: { code: string; listPath?: string }) {
  useCertificateFonts();
  const detail = useCertificateDetail(code, "/certificates");
  const row = detail.detailQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button asChild className="-ml-2 mb-1" size="sm" variant="ghost">
            <Link href={listPath as Route}>
              <ArrowLeft size={16} /> Danh sách chứng nhận
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <CertificateIcon size={26} /> Chi tiết chứng nhận
          </h1>
          <p className="mt-1 truncate text-sm text-muted">
            {row ? `${String(row.certificateCode ?? code)} · ${String(row.leaderFullName ?? "")}` : code}
          </p>
        </div>
        <CertificateScanDialog
          trigger={
            <Button type="button" variant="outline">
              <QrCode size={18} /> Quét mã khác
            </Button>
          }
        />
      </div>
      {detail.detailQuery.isError ? (
        <Panel className="p-5 text-sm text-muted">Bạn chỉ xem được chứng nhận thuộc phạm vi quản lý của mình. Nếu mã không đúng, hãy quét lại.</Panel>
      ) : null}
      <CertificateDetailBody detail={detail} split />
    </div>
  );
}
