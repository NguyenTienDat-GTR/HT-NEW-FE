import type { MyProfile, MyRole } from "./account-api";

export const PROFILE_PATH = "/profile";

/** Nhãn dự phòng theo mã, chỉ dùng khi hồ sơ (có tên vai trò từ DB) chưa tải xong. */
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Quản trị tối cao",
  ADMIN_DIOCESE: "Admin Liên đoàn",
  ADMIN_DEANERY: "Admin Hiệp đoàn",
  ADMIN_PARISH: "Admin Xứ đoàn",
};

export function roleLabel(role: string) {
  const code = role.startsWith("ROLE_") ? role.slice(5) : role;
  return roleLabels[code] ?? code.replaceAll("_", " ").toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

/** Tên vai trò chính: lấy từ hồ sơ (tên trong DB), nếu chưa tải xong thì dùng nhãn theo mã. */
export function primaryRoleName(roles: MyRole[] | undefined, fallbackCodes: string[] | undefined) {
  const primary = roles?.find((role) => role.primary) ?? roles?.[0];
  if (primary) return primary.name;
  return fallbackCodes?.[0] ? roleLabel(fallbackCodes[0]) : "Chưa có vai trò";
}

/** Tên hiển thị: Tên thánh + họ tên nếu gắn Huynh Trưởng, ngược lại là username. */
export function displayName(profile: MyProfile | undefined, fallbackUsername: string | undefined) {
  const leader = profile?.leader;
  const fullName = leader?.fullName?.trim();
  if (fullName) return [leader?.holyName?.trim(), fullName].filter(Boolean).join(" ");
  return profile?.username ?? fallbackUsername ?? "Tài khoản";
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "HT";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase();
}
