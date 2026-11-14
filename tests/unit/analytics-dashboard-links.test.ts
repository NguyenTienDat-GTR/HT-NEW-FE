import { describe, expect, it } from "vitest";
import { dashboardHref } from "@/modules/analytics/dashboard-links";

describe("dashboardHref: lối tắt kèm bộ lọc từ tổng quan", () => {
  it("việc cần xử lý mở đúng danh sách với bộ lọc chọn sẵn", () => {
    expect(dashboardHref("pendingRegistrations", "/training/approvals")).toBe("/training/approvals?approvalStatus=PENDING");
    expect(dashboardHref("rejectedRegistrations", "/training/approvals")).toBe("/training/approvals?approvalStatus=REJECTED");
    expect(dashboardHref("pendingScoring", "/training/scores")).toBe("/training/scores?result=UNCOMPLETED");
    expect(dashboardHref("closingCourses", "/training/courses")).toBe("/training/courses?registrationStatus=OPEN");
    expect(dashboardHref("pendingCertificates", "/certificates/approvals")).toBe("/certificates/approvals?approvalStatus=PENDING");
  });

  it("điểm cần chú ý có bộ lọc tương ứng; mục không có bộ lọc riêng chỉ mở danh sách", () => {
    expect(dashboardHref("stalePendingApprovals", "/training/approvals")).toBe("/training/approvals?approvalStatus=PENDING");
    expect(dashboardHref("slowCertificateApprovals", "/certificates/approvals")).toBe("/certificates/approvals?approvalStatus=PENDING");
    expect(dashboardHref("highRejectionRate", "/certificates/approvals")).toBe("/certificates/approvals?approvalStatus=REJECTED");
    expect(dashboardHref("lowPassRateCourses", "/training/courses")).toBe("/training/courses?organizingStatus=ENDED");
    expect(dashboardHref("lowActiveRate", "/leaders")).toBe("/leaders/profiles?status=inactive");
    expect(dashboardHref("highCancellationCourses", "/training/courses")).toBe("/training/courses");
  });

  it("href của BE không khớp trang web được đổi sang trang thật; khóa lạ giữ href, không có gì thì null", () => {
    expect(dashboardHref("parishesWithoutLeaders", "/organizations")).toBe("/organization/parishes");
    expect(dashboardHref("moi", "/leaders")).toBe("/leaders/profiles");
    expect(dashboardHref("moi", "/training/courses?x=1")).toBe("/training/courses?x=1");
    expect(dashboardHref("moi", null)).toBeNull();
  });
});
