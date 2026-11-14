// Lối tắt từ tổng quan (việc cần xử lý, điểm cần chú ý) tới danh sách tương ứng, kèm bộ lọc chọn sẵn.
// BE chỉ trả đường dẫn trang (href); bộ lọc nằm ở đây vì chỉ giao diện biết khóa bộ lọc của từng danh sách.
// Bộ lọc đi qua query của URL (cùng khóa với thanh lọc của danh sách), nên người dùng thấy ngay lựa chọn và đổi được.

type Target = { path: string; query?: Record<string, string> };

const APPROVALS = "/training/approvals";
const SCORES = "/training/scores";
const COURSES = "/training/courses";
const CERTIFICATE_APPROVALS = "/certificates/approvals";
const LEADERS = "/leaders/profiles";
const PARISHES = "/organization/parishes";

const TARGETS: Record<string, Target> = {
  // Việc cần xử lý.
  pendingRegistrations: { path: APPROVALS, query: { approvalStatus: "PENDING" } },
  rejectedRegistrations: { path: APPROVALS, query: { approvalStatus: "REJECTED" } },
  // Danh sách chấm điểm chưa có bộ lọc "chưa chấm": "Không đạt" gồm cả hồ sơ chưa có điểm.
  pendingScoring: { path: SCORES, query: { result: "UNCOMPLETED" } },
  closingCourses: { path: COURSES, query: { registrationStatus: "OPEN" } },
  pendingCertificates: { path: CERTIFICATE_APPROVALS, query: { approvalStatus: "PENDING" } },
  // Điểm cần chú ý.
  slowCertificateApprovals: { path: CERTIFICATE_APPROVALS, query: { approvalStatus: "PENDING" } },
  highRejectionRate: { path: CERTIFICATE_APPROVALS, query: { approvalStatus: "REJECTED" } },
  stalePendingApprovals: { path: APPROVALS, query: { approvalStatus: "PENDING" } },
  scoringOverdue: { path: SCORES, query: { result: "UNCOMPLETED" } },
  registrationClosingSoon: { path: COURSES, query: { registrationStatus: "OPEN" } },
  lowPassRateCourses: { path: COURSES, query: { organizingStatus: "ENDED" } },
  highCancellationCourses: { path: COURSES },
  lowActiveRate: { path: LEADERS, query: { status: "inactive" } },
  youthShortage: { path: LEADERS },
  genderImbalance: { path: LEADERS },
  parishesWithoutLeaders: { path: PARISHES },
  inactiveUnits: { path: PARISHES, query: { status: "inactive" } },
};

// BE trả "/leaders" và "/organizations"; trang thật của web nằm ở đường dẫn dài hơn.
const PATH_ALIASES: Record<string, string> = { "/leaders": LEADERS, "/organizations": PARISHES };

/**
 * Đường dẫn (kèm query bộ lọc) để mở khi bấm một mục của tổng quan: theo khóa mục (`key`) nếu có bộ lọc riêng,
 * không thì theo href của BE. Không có đích nào thì trả null (mục không bấm được).
 */
export function dashboardHref(key: string, fallbackHref?: string | null): string | null {
  const target = TARGETS[key];
  if (!target) {
    if (!fallbackHref) return null;
    const [path = "", query] = fallbackHref.split("?");
    return `${PATH_ALIASES[path] ?? path}${query ? `?${query}` : ""}`;
  }
  const query = new URLSearchParams(target.query).toString();
  return query ? `${target.path}?${query}` : target.path;
}
