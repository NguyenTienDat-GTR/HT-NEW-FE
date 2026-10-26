import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { CourseParticipantsHub } from "@/modules/course-participants/components/course-participants-hub";
import { ParticipantDetailDrawer } from "@/modules/course-participants/components/participant-detail-drawer";
import { HeaderScanButton } from "@/modules/qr-scan/components/header-scan-button";
import { formatDateTime, genderLabel, invitationLabel } from "@/modules/course-participants/participant-detail";
import type { ParticipantDetail } from "@/modules/course-participants/types";

vi.mock("jsqr", () => ({ default: vi.fn(() => null) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn() } }));

const envelope = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data, message: status < 400 ? null : data }), { status, headers: { "content-type": "application/json" } });

const detail: ParticipantDetail = {
  id: "p1", courseCode: "KH-1", courseName: "Khóa Dự trưởng", attendanceEnabled: true,
  holyName: "Giuse", fullName: "Nguyễn Văn An", gender: "NAM", birthDate: "1995-03-07", phone: "0901234567",
  parishName: "Bà Lụa", deaneryName: "Thủ Dầu Một", dioceseName: "Phú Cường", teamName: "Đội 1",
  email: "an@example.com", invitationSentAt: "2026-10-24T01:00:00Z", invitationError: null, emailProblem: null,
  checkedInAt: "2026-10-24T02:00:00Z", checkedInBy: "scanner1", checkedInByName: "Nguyễn Người Quét",
  approvalStatus: "APPROVED", approvedBy: "approver", approvedByName: "Trần Người Duyệt",
  createdBy: "creator", createdByName: "Lê Người Tạo", createdAt: "2026-10-01T00:00:00Z", updatedBy: "scanner1", updatedByName: "Nguyễn Người Quét",
};

function wrap(ui: React.ReactElement) {
  return render(
    <Tooltip.Provider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
    </Tooltip.Provider>,
  );
}

beforeEach(() => useAuthStore.getState().setAccessToken("token"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.getState().clear();
});

describe("participant detail helpers", () => {
  it("formats dates and genders safely", () => {
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime("không phải ngày")).toBe("");
    expect(formatDateTime("2026-10-24T02:00:00Z")).toContain("2026");
    expect(genderLabel("NAM")).toBe("Nam");
    expect(genderLabel("NU")).toBe("Nữ");
    expect(genderLabel(null)).toBe("");
  });

  it("picks the email label by priority: error, sent, bad email, none", () => {
    expect(invitationLabel({ invitationError: "x", invitationSentAt: "2026", emailProblem: null })).toEqual({ label: "Gửi lỗi", tone: "danger" });
    expect(invitationLabel({ invitationError: null, invitationSentAt: "2026", emailProblem: "Email không hợp lệ: a" })).toEqual({ label: "Đã gửi", tone: "success" });
    expect(invitationLabel({ invitationError: null, invitationSentAt: null, emailProblem: "Email không hợp lệ: a" }).label).toBe("Email sai định dạng");
    expect(invitationLabel({ invitationError: null, invitationSentAt: null, emailProblem: "Hồ sơ chưa có email" }).label).toBe("Chưa có email");
    expect(invitationLabel({ invitationError: null, invitationSentAt: null, emailProblem: null })).toEqual({ label: "Chưa gửi", tone: undefined });
  });
});

describe("ParticipantDetailDrawer", () => {
  it("shows attendance, email and who created / approved / checked in", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      urls.push(String(input));
      return envelope(detail);
    });
    wrap(<ParticipantDetailDrawer courseCode="KH-1" onClose={() => undefined} participationId="p1" />);
    expect(await screen.findByText("Giuse Nguyễn Văn An")).toBeInTheDocument();
    expect(urls[0]).toBe("/backend/api/training/courses/KH-1/attendance/participants/p1");
    expect(screen.getByText("Đã điểm danh")).toBeInTheDocument();
    expect(screen.getAllByText("Nguyễn Người Quét (scanner1)", { selector: "dd" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Lê Người Tạo (creator)")).toBeInTheDocument();
    expect(screen.getByText("Trần Người Duyệt (approver)")).toBeInTheDocument();
    expect(screen.getByText("an@example.com")).toBeInTheDocument();
    expect(screen.getByText("Đã gửi")).toBeInTheDocument();
    expect(screen.getByText("Bà Lụa")).toBeInTheDocument();
    expect(screen.getByText("Phú Cường")).toBeInTheDocument();
    expect(screen.getByText("Nam")).toBeInTheDocument();
  });

  it("shows the last send error and empty values as Chưa có", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      envelope({ ...detail, checkedInAt: null, checkedInBy: null, checkedInByName: null, invitationSentAt: null, invitationError: "Không gửi được email: 550", approvedBy: null, approvedByName: null }),
    );
    wrap(<ParticipantDetailDrawer courseCode="KH-1" onClose={() => undefined} participationId="p1" />);
    expect(await screen.findByText("Không gửi được email: 550")).toBeInTheDocument();
    expect(screen.getByText("Chưa điểm danh")).toBeInTheDocument();
    expect(screen.getByText("Gửi lỗi")).toBeInTheDocument();
    expect(screen.getAllByText("Chưa có").length).toBeGreaterThan(1);
  });

  it("explains a course without attendance and shows the server error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope({ ...detail, attendanceEnabled: false }));
    const first = wrap(<ParticipantDetailDrawer courseCode="KH-1" onClose={() => undefined} participationId="p1" />);
    expect(await screen.findByText("Khóa chưa bật điểm danh.")).toBeInTheDocument();
    first.unmount();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope("Hồ sơ không còn trong danh sách tham dự của khóa", 409));
    wrap(<ParticipantDetailDrawer courseCode="KH-1" onClose={() => undefined} participationId="p2" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Hồ sơ không còn trong danh sách tham dự của khóa");
  });

  it("does not fetch while closed and closes through the button", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(detail));
    const onClose = vi.fn();
    const closed = wrap(<ParticipantDetailDrawer courseCode="KH-1" onClose={onClose} participationId={null} />);
    expect(fetchSpy).not.toHaveBeenCalled();
    closed.unmount();
    wrap(<ParticipantDetailDrawer courseCode="KH-1" onClose={onClose} participationId="p1" />);
    await screen.findByText("Giuse Nguyễn Văn An");
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("hub: detail link and separate scan permission", () => {
  const summary = { courseCode: "KH-1", attendanceEnabled: true, autoSendInvitation: false, totalParticipants: 1, checkedIn: 0, notCheckedIn: 1, invitationSent: 0, invitationPending: 1, invitationFailed: 0, withoutEmail: 0 };
  const row = { id: "p1", holyName: "Giuse", fullName: "Nguyễn Văn An", email: "an@example.com" };
  const base = { courseCode: "KH-1", courseName: "Khóa 1", attendanceEnabled: true, autoSendInvitation: false, disabled: false, finished: false };

  function mockApi() {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/attendance/summary")) return envelope(summary);
      if (url.includes("/attendance/participants/p1")) return envelope(detail);
      if (url.includes("/attendance/participants")) return envelope({ content: [row], totalElements: 1, totalPages: 1, size: 20, number: 0 });
      if (url.includes("/teams/options")) return envelope([]);
      return envelope({});
    });
  }

  it("clicking a name opens the detail drawer for that hồ sơ", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={{ ...base, canManage: false, canScan: false }} search="" />);
    fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Nguyễn Văn An" }));
    expect(await screen.findByText("Khóa Dự trưởng", { exact: false })).toBeInTheDocument();
    expect((await screen.findAllByText("Nguyễn Người Quét (scanner1)", { selector: "dd" })).length).toBeGreaterThan(0);
  });

  it("the scan permission alone shows the scanner and manual check-in, but not email sending", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={{ ...base, canManage: false, canScan: true }} search="" />);
    await screen.findByText("Giuse Nguyễn Văn An");
    expect(screen.getByRole("button", { name: /Quét QR điểm danh/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Điểm danh Nguyễn Văn An" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gửi email/ })).toBeNull();
  });

  it("the approve permission alone can send emails but cannot scan or check in", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={{ ...base, canManage: true, canScan: false }} search="" />);
    await screen.findByText("Giuse Nguyễn Văn An");
    expect(screen.getByRole("button", { name: /Gửi email/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Quét QR điểm danh/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Điểm danh Nguyễn Văn An" })).toBeNull();
  });

  it("a finished course blocks scanning even with the permission", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={{ ...base, canManage: true, canScan: true, finished: true }} search="" />);
    await screen.findByText("Giuse Nguyễn Văn An");
    expect(screen.queryByRole("button", { name: /Quét QR điểm danh/ })).toBeNull();
  });
});

describe("header button permission", () => {
  it("is hidden for the approve permission and shown for the scan permission", () => {
    useAuthStore.getState().setUser({ username: "u", roles: [], permissions: ["training.participation.approve.deanery", "training.participation.read.deanery"] });
    const first = wrap(<HeaderScanButton />);
    expect(screen.queryByRole("button", { name: /Quét mã QR/ })).toBeNull();
    first.unmount();
    useAuthStore.getState().setUser({ username: "u", roles: [], permissions: ["training.attendance.scan.diocese"] });
    wrap(<HeaderScanButton />);
    expect(screen.getByRole("button", { name: /Quét mã QR/ })).toBeInTheDocument();
    void waitFor;
  });
});
