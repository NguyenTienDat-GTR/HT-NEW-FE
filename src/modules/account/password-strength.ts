export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Gợi ý để có mật khẩu mạnh (không bắt buộc, BE chỉ yêu cầu 8–72 ký tự). */
export const strongPasswordHints = [
  { id: "upper", label: "Có chữ hoa (A–Z)", test: (value: string) => /[A-Z]/.test(value) },
  { id: "lower", label: "Có chữ thường (a–z)", test: (value: string) => /[a-z]/.test(value) },
  { id: "digit", label: "Có chữ số (0–9)", test: (value: string) => /\d/.test(value) },
  { id: "special", label: "Có ký tự đặc biệt (!@#$%...)", test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
  { id: "long", label: "Dài từ 12 ký tự trở lên", test: (value: string) => value.length >= 12 },
] as const;

export type PasswordStrength = { level: 1 | 2 | 3; label: string; color: string; text: string };

/** Yếu: dưới 8 ký tự hoặc đạt ≤ 2 gợi ý; Trung bình: 3–4 gợi ý; Mạnh: đạt đủ chữ hoa, thường, số, ký tự đặc biệt. */
export function passwordStrength(value: string): PasswordStrength {
  const met = strongPasswordHints.filter((hint) => hint.test(value)).map((hint) => hint.id);
  const hasAllKinds = ["upper", "lower", "digit", "special"].every((id) => met.includes(id as (typeof met)[number]));
  if (value.length < PASSWORD_MIN_LENGTH || met.length <= 2) {
    return { level: 1, label: "Yếu", color: "bg-danger", text: "text-danger" };
  }
  if (!hasAllKinds) return { level: 2, label: "Trung bình", color: "bg-[var(--warning)]", text: "text-[var(--warning)]" };
  return { level: 3, label: "Mạnh", color: "bg-[var(--success)]", text: "text-[var(--success)]" };
}
