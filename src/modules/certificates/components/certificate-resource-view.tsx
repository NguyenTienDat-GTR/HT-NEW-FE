"use client";

import { QrCode } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CertificateScanDialog } from "./certificate-scan-dialog";
import { CertificateCardGrid } from "./certificate-card-grid";
import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { CertificateSigner } from "@/components/common/resource/approval-dialog";
import type { RouteConfig } from "@/config/routes/routes";

export function CertificateResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Chứng nhận",
        moduleDescription: "Quản lý chứng nhận, duyệt ngoại lệ và promotion sau khi hồ sơ đã chấm điểm.",
        // Chế độ xem thẻ / bảng (chỉ khi không nhúng trong chi tiết khóa).
        cardView: { render: (props) => <CertificateCardGrid {...props} />, defaultMode: "card" },
        buildApprovePath,
        buildApproveBody,
        // Duyệt chứng nhận bắt buộc chọn người ký, ghi trực tiếp vào chứng nhận.
        captureSigner: true,
        bulkApprovePath: route.moduleName === "certificate.approval" ? "/certificates/bulk-approval" : undefined,
        buildBulkBody,
        // Danh sách & tab duyệt chứng nhận: cho chọn nhiều hồ sơ và xuất PDF (một hoặc nhiều) qua mail merge.
        // Quét mã QR trên chứng nhận để mở trang chi tiết chứng nhận.
        toolbarActions:
          route.moduleName === "certificate.list" ? (
            <CertificateScanDialog
              tip="Quét mã QR trên chứng nhận để xem chi tiết"
              trigger={
                <Button size="sm" type="button" variant="outline">
                  <QrCode size={16} /> Quét QR
                </Button>
              }
            />
          ) : undefined,
        enablePdfExport: route.moduleName === "certificate.list" || route.moduleName === "certificate.approval",
        pdfExportPath:
          route.moduleName === "certificate.list" || route.moduleName === "certificate.approval" ? "/certificates/export-pdf" : undefined,
      }}
    />
  );
}

function buildApprovePath(_route: RouteConfig, _rows: Record<string, unknown>[], id: string, approved = true) {
  return `/certificates/${encodeURIComponent(id)}/${approved ? "approve" : "reject"}`;
}

function buildApproveBody(_route: RouteConfig, note?: string, approved = true, signer?: CertificateSigner) {
  return approved
    ? { approvalReason: note || undefined, signerType: signer?.signerType, signerName: signer?.signerName, signerTitle: signer?.signerTitle }
    : { reason: note || undefined };
}

function buildBulkBody(ids: string[], approved: boolean, note: string, reasons?: Record<string, string>, signer?: CertificateSigner) {
  return {
    ids,
    approved,
    reason: note || undefined,
    reasons,
    signerType: signer?.signerType,
    signerName: signer?.signerName,
    signerTitle: signer?.signerTitle,
  };
}
