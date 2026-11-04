import type { QueryClient } from "@tanstack/react-query";

/**
 * Khóa React Query dùng chung. Mọi danh sách/chi tiết tài nguyên nằm dưới gốc "resource" nên
 * `resourceKey()` làm mới (hoặc xóa) toàn bộ, còn `resourceKey(endpoint)` chỉ làm mới một tài nguyên.
 */
const RESOURCE_ROOT = "resource";

export function resourceKey(...parts: readonly unknown[]) {
  return [RESOURCE_ROOT, ...parts] as const;
}

/** Khóa của một trang danh sách: endpoint + query string đã chuẩn hóa. */
export function resourceListKey(endpoint: string | undefined, queryString: string | undefined) {
  return resourceKey(endpoint, queryString);
}

/**
 * Gốc của mọi query giữ dữ liệu nghiệp vụ (danh sách, chi tiết, tab tham dự, trang huynh trưởng, thống kê...).
 * Không gồm phiên đăng nhập, thông báo và danh mục cấu hình vì các thao tác ghi dữ liệu không làm chúng đổi.
 */
const DATA_QUERY_ROOTS = new Set<unknown>([
  RESOURCE_ROOT,
  "resource-detail",
  "course-participants",
  "score-components",
  "course-status-impact",
  "certificate-preview",
  "cross-deanery",
  "prerequisite-copy-candidates",
  "registration-candidates",
  "leader-detail-page",
  "leader-detail-courses",
  "leader-detail-certificates",
  "leader-detail-accounts",
  "leader-rank-history",
  "leader-rank-history-page",
  "analytics",
  "executive-board-seats",
  "unit-toggle-impact",
  "unit-status-history",
  "field-options",
  "field-option-count",
  "field-helper",
  "toolbar-filter-options",
  "registration-scope",
  "parent-parish-options",
  "score-component-copy-sources",
  "leader-transfer",
  "quick-search",
]);

/** Hồ sơ của tôi (["auth", "me", "profile", ...]) có chứng nhận và cấp độ của chính huynh trưởng nên cũng phải làm mới. */
function isMyProfileQuery(queryKey: readonly unknown[]) {
  return queryKey[0] === "auth" && queryKey[1] === "me" && queryKey[2] === "profile";
}

/**
 * Làm mới mọi query dữ liệu sau một thao tác ghi (tạo, sửa, đăng ký, duyệt, từ chối, chấm điểm, khóa điểm, kết thúc khóa,
 * thu hồi / cấp lại chứng nhận...). Một thao tác thường đổi nhiều màn cùng lúc (khóa, hồ sơ tham dự, chứng nhận, cấp độ
 * huynh trưởng, thống kê) nên làm mới theo nhóm thay vì từng key: query đang hiển thị tải lại ngay, query khác bị đánh dấu cũ
 * và tải lại khi mở, không còn hiện dữ liệu cũ trong `staleTime`.
 *
 * Không chờ tải lại xong: thao tác báo xong ngay (toast, đóng hộp thoại), dữ liệu cập nhật ở nền. Không hủy lượt tải đang chạy
 * (`cancelRefetch: false`): nhiều lần làm mới liền nhau dùng chung một lượt tải thay vì hủy rồi gửi lại từ đầu.
 */
export function invalidateDataQueries(queryClient: QueryClient): Promise<void> {
  void queryClient
    .invalidateQueries({ predicate: (query) => DATA_QUERY_ROOTS.has(query.queryKey[0]) || isMyProfileQuery(query.queryKey) }, { cancelRefetch: false })
    .catch(() => undefined);
  return Promise.resolve();
}
