import type { RouteConfig } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";
import type { ReactNode } from "react";
import type { CertificateSigner } from "./approval-dialog";

export type ResourceListModuleConfig = {
  moduleLabel: string;
  moduleDescription: string;
  canCreate?: (route: RouteConfig, user: AuthUser | null) => boolean;
  buildApprovePath?: (route: RouteConfig, rows: Record<string, unknown>[], id: string, approved?: boolean) => string;
  // Duyệt chứng nhận: bắt buộc chọn người ký trong hộp thoại duyệt.
  captureSigner?: boolean;
  buildApproveBody?: (route: RouteConfig, note?: string, approved?: boolean, signer?: CertificateSigner, achievedLevel?: string) => unknown;
  // Duyệt hồ sơ tham dự: hồ sơ ngoại lệ bắt buộc chọn cấp độ đạt được trong hộp thoại duyệt.
  exceptionLevel?: boolean;
  // Duyệt/từ chối nhiều hồ sơ một lần.
  bulkApprovePath?: string;
  // Body gửi lên bulkApprovePath; reasons là lý do riêng theo id hồ sơ (khi từ chối).
  buildBulkBody?: (ids: string[], approved: boolean, note: string, reasons?: Record<string, string>, signer?: CertificateSigner, achievedLevels?: Record<string, string>) => unknown;
  // Thu hồi một hồ sơ.
  // Bảng chấm điểm: thêm cột điểm thành phần nhập trực tiếp trên từng hồ sơ (khi nhúng trong chi tiết khóa).
  scoreEntry?: boolean;
  // Xóa hồ sơ khỏi danh sách tham dự.
  buildRemovePath?: (id: string) => string;
  buildWithdrawPath?: (id: string) => string;
  // Cho phép chọn nhiều hồ sơ và xuất PDF chứng nhận (một hoặc nhiều) qua pdfExportPath.
  enablePdfExport?: boolean;
  // Nút bổ sung trên thanh công cụ danh sách (vd quét mã QR chứng nhận).
  toolbarActions?: ReactNode;
  pdfExportPath?: string;
  // Chế độ xem dạng thẻ (ngoài bảng): trang danh sách có công tắc Bảng / Thẻ, bỏ qua khi nhúng trong trang khác.
  cardView?: {
    render: (props: { rows: Record<string, unknown>[]; route: RouteConfig; isLoading: boolean }) => ReactNode;
    defaultMode?: "table" | "card";
  };
};

export type ResourceListRuntimeProps = {
  route: RouteConfig;
  config: ResourceListModuleConfig;
};
