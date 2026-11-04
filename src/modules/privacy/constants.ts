/** Phiên bản chính sách hiển thị trên trang. Phải khớp `app.privacy.policy-version` của BE: đổi một nơi thì đổi cả nơi kia. */
export const PRIVACY_POLICY_VERSION = "1.0";
export const PRIVACY_POLICY_UPDATED_AT = "04/11/2026";
export const PRIVACY_POLICY_PATH = "/chinh-sach-bao-mat" as const;

// Bên kiểm soát dữ liệu là một cá nhân (không phải doanh nghiệp) vận hành hệ thống C-LEAD, nên không có mã số doanh nghiệp
// và chỉ ghi tỉnh/thành, không ghi địa chỉ nhà. Đổi ở đây thì trang chính sách và các ô đồng ý tự cập nhật.
export const CONTROLLER_NAME = "C-LEAD";
export const CONTROLLER_ADDRESS = "Thành phố Hồ Chí Minh";
export const CONTROLLER_EMAIL = "quanly.huynhtruong.tnttvn@gmail.com";

export const PRIVACY_POLICY_LINK_LABEL = "Chính sách bảo vệ dữ liệu cá nhân";
