import type { RouteConfig } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";

export type ResourceListModuleConfig = {
  moduleLabel: string;
  moduleDescription: string;
  canCreate?: (route: RouteConfig, user: AuthUser | null) => boolean;
  buildApprovePath?: (route: RouteConfig, rows: Record<string, unknown>[], id: string) => string;
  // Duyệt/từ chối nhiều hồ sơ một lần.
  bulkApprovePath?: string;
  // Thu hồi một hồ sơ.
  // Bảng chấm điểm: thêm cột điểm thành phần nhập trực tiếp trên từng hồ sơ (khi nhúng trong chi tiết khóa).
  scoreEntry?: boolean;
  // Xóa hồ sơ khỏi danh sách tham dự.
  buildRemovePath?: (id: string) => string;
  buildWithdrawPath?: (id: string) => string;
  buildApproveBody?: (route: RouteConfig, note?: string, approved?: boolean) => unknown;
};

export type ResourceListRuntimeProps = {
  route: RouteConfig;
  config: ResourceListModuleConfig;
};
