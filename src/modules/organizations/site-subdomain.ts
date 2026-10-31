// Subdomain (trang riêng) của giáo phận: quy tắc phải khớp BE (SiteSubdomainRules) để báo lỗi ngay khi nhập.
export const SITE_SUBDOMAIN_PERMISSION = "organization.diocese.site_subdomain.manage.all";

// Nhãn dành riêng cho hệ thống (môi trường test, thư...), BE cũng từ chối.
export const RESERVED_SUBDOMAINS = ["www", "test", "staging", "api", "mail", "admin"] as const;

const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export function normalizeSubdomain(value: string) {
  return value.trim().toLowerCase();
}

/** Trả thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ. */
export function validateSubdomain(value: string): string | null {
  const normalized = normalizeSubdomain(value);
  if (!normalized) return "Vui lòng nhập subdomain";
  if (!LABEL_PATTERN.test(normalized)) {
    return "Chỉ gồm chữ thường không dấu, số và dấu gạch ngang (3-63 ký tự), không bắt đầu hoặc kết thúc bằng dấu gạch ngang";
  }
  if ((RESERVED_SUBDOMAINS as readonly string[]).includes(normalized)) {
    return `"${normalized}" được dành riêng cho hệ thống, vui lòng chọn tên khác`;
  }
  return null;
}
