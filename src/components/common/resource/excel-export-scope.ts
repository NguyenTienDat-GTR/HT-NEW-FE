import type { AuthUser } from "@/lib/auth/auth-store";
import { isSuperAdmin } from "@/lib/auth/permissions";

// Tùy chọn của hộp thoại "Xuất Excel" theo cấp tài khoản: danh sách tài khoản thấy đã bị BE giới hạn theo phạm vi của nó,
// nên các tùy chọn gom nhóm theo đơn vị cùng cấp hoặc cao hơn không có nghĩa (giáo xứ chỉ có một giáo xứ, giáo hạt chỉ có một giáo hạt).

export type ExportLevel = "DIOCESE" | "DEANERY" | "PARISH";
export type TemplateGroupBy = "NONE" | "DEANERY" | "PARISH";

/** Cấp cao nhất mà tài khoản có quyền hồ sơ tham dự (giáo phận > giáo hạt > giáo xứ), theo hậu tố của quyền, như BE. Super admin là cấp giáo phận. */
export function exportLevelOf(user: AuthUser | null | undefined): ExportLevel {
  if (!user) return "PARISH";
  if (isSuperAdmin(user)) return "DIOCESE";
  const scoped = user.permissions.filter((permission) => permission.startsWith("training.participation."));
  if (scoped.some((permission) => permission.endsWith(".diocese"))) return "DIOCESE";
  if (scoped.some((permission) => permission.endsWith(".deanery"))) return "DEANERY";
  return "PARISH";
}

/** Các cách gom danh sách khi xuất theo mẫu đăng ký. Cấp giáo xứ không có lựa chọn nào (xuất thẳng một danh sách); cấp giáo hạt không gom theo giáo hạt. */
export function templateGroupOptions(level: ExportLevel): TemplateGroupBy[] {
  if (level === "PARISH") return [];
  if (level === "DEANERY") return ["NONE", "PARISH"];
  return ["NONE", "DEANERY", "PARISH"];
}
