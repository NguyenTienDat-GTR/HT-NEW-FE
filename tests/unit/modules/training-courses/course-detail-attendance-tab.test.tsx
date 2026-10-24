import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findRoute } from "@/config/routes/routes";
import { useAuthStore } from "@/lib/auth/auth-store";
import { CourseDetailPage } from "@/modules/training-courses/components/course-detail-page";

let currentTab: string | null = null;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(currentTab ? `tab=${currentTab}` : ""),
  usePathname: () => "/training/courses/KH-1",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn() } }));
vi.mock("@/modules/training-workflow/components/training-workflow-resource-view", () => ({ TrainingWorkflowResourceView: () => <div>workflow-view</div> }));
vi.mock("@/modules/certificates/components/certificate-resource-view", () => ({ CertificateResourceView: () => <div>certificate-view</div> }));
vi.mock("@/modules/training-teams/components/course-teams-view", () => ({ CourseTeamsView: () => <div>teams-view</div> }));
vi.mock("jsqr", () => ({ default: vi.fn(() => null) }));

const envelope = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { headers: { "content-type": "application/json" } });
const pageOf = (content: unknown[]) => envelope({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, size: 10, number: 0, first: true, last: true });

const baseCourse = {
  courseCode: "KH-1", courseName: "Khóa Dự Trưởng", status: true, pastCourse: false, certificateRequired: true,
  attendanceEnabled: true, autoSendInvitation: false, startDate: "2026-08-01", endDate: "2026-08-05",
  registrationStartAt: "2026-07-01T00:00:00+07:00", registrationEndAt: "2026-07-20T00:00:00+07:00",
};

const summary = (overrides: Record<string, unknown> = {}) => ({
  courseCode: "KH-1", attendanceEnabled: true, autoSendInvitation: false, totalParticipants: 8, checkedIn: 0, notCheckedIn: 8,
  invitationSent: 3, invitationPending: 5, invitationFailed: 0, withoutEmail: 1, ...overrides,
});

function mockApi(course: Record<string, unknown>, summaryOverrides: Record<string, unknown> = {}) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input).replace("/backend/api", "");
    if (url.startsWith("/training/courses/KH-1/attendance/summary")) return envelope(summary(summaryOverrides));
    if (url.startsWith("/training/courses/KH-1/attendance/participants")) return pageOf([]);
    if (url.startsWith("/training/courses/KH-1/teams/options")) return envelope([]);
    if (url.startsWith("/training/courses/KH-1")) return envelope(course);
    if (url.startsWith("/training/participants") || url.startsWith("/training/participations") || url.startsWith("/certificates")) return pageOf([]);
    return envelope({});
  });
}

function login(permissions: string[]) {
  useAuthStore.getState().setUser({ username: "admin", roles: ["ADMIN_DEANERY"], permissions });
}

function renderPage() {
  const route = findRoute("/training/courses")!;
  return render(
    <Tooltip.Provider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <CourseDetailPage id="KH-1" route={route} />
      </QueryClientProvider>
    </Tooltip.Provider>,
  );
}

beforeEach(() => {
  useAuthStore.getState().setAccessToken("token");
  currentTab = null;
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.getState().clear();
});

const APPROVER = ["training.participation.read.deanery", "training.participation.approve.deanery", "training.attendance.scan.deanery", "training.course.read.deanery"];

describe("course detail: Thẻ & điểm danh tab", () => {
  it("adds the tab for a regular course when the user can read participants", async () => {
    login(APPROVER);
    mockApi(baseCourse);
    renderPage();
    expect(await screen.findByRole("tab", { name: /Thẻ & điểm danh/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Chia đội/ })).toBeInTheDocument();
  });

  it("hides the tab for a past course", async () => {
    login(APPROVER);
    mockApi({ ...baseCourse, pastCourse: true });
    renderPage();
    await screen.findByText("Khóa Dự Trưởng");
    await waitFor(() => expect(screen.queryByRole("tab", { name: /Thẻ & điểm danh/ })).toBeNull());
    expect(screen.getByRole("tab", { name: /Danh sách tham dự/ })).toBeInTheDocument();
  });

  it("hides the tab from users without any participant permission", async () => {
    login(["training.course.read.deanery"]);
    mockApi(baseCourse);
    renderPage();
    await screen.findByText("Khóa Dự Trưởng");
    expect(screen.queryByRole("tab", { name: /Thẻ & điểm danh/ })).toBeNull();
  });

  it("renders the hub when the tab is selected", async () => {
    login(APPROVER);
    currentTab = "attendance";
    mockApi(baseCourse);
    renderPage();
    expect(await screen.findByText("Danh sách tham dự", { selector: "h2" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Quét QR điểm danh/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gửi email/ })).toBeInTheDocument();
  });

  it("shows the two new flags in the course information", async () => {
    login(APPROVER);
    mockApi({ ...baseCourse, attendanceEnabled: true, autoSendInvitation: false });
    renderPage();
    expect(await screen.findByText("Bật điểm danh bằng QR")).toBeInTheDocument();
    expect(screen.getByText("Tự gửi email khi duyệt")).toBeInTheDocument();
  });
});

describe("course detail: banner for approved participants never emailed", () => {
  it("offers to send when auto-send is on and some approved participants were never sent", async () => {
    login(APPROVER);
    mockApi({ ...baseCourse, autoSendInvitation: true });
    renderPage();
    expect(await screen.findByRole("button", { name: "Gửi cho 4 hồ sơ" })).toBeInTheDocument();
  });

  it("is not shown when auto-send is off", async () => {
    login(APPROVER);
    mockApi({ ...baseCourse, autoSendInvitation: false });
    renderPage();
    await screen.findByText("Khóa Dự Trưởng");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("button", { name: /Gửi cho/ })).toBeNull();
  });

  it("is not shown to users who cannot approve, on finished courses or past courses", async () => {
    login(["training.participation.read.deanery"]);
    mockApi({ ...baseCourse, autoSendInvitation: true });
    const first = renderPage();
    await screen.findByText("Khóa Dự Trưởng");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("button", { name: /Gửi cho/ })).toBeNull();
    first.unmount();

    login(APPROVER);
    mockApi({ ...baseCourse, autoSendInvitation: true, finishedAt: "2026-08-06T00:00:00+07:00" });
    const second = renderPage();
    await screen.findByText("Khóa Dự Trưởng");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("button", { name: /Gửi cho/ })).toBeNull();
    second.unmount();

    mockApi({ ...baseCourse, autoSendInvitation: true, pastCourse: true });
    renderPage();
    await screen.findByText("Khóa Dự Trưởng");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("button", { name: /Gửi cho/ })).toBeNull();
  });

  it("is not shown when everything reachable has been sent", async () => {
    login(APPROVER);
    mockApi({ ...baseCourse, autoSendInvitation: true }, { invitationPending: 1, withoutEmail: 1 });
    renderPage();
    await screen.findByText("Khóa Dự Trưởng");
    await waitFor(() => expect(screen.queryByRole("button", { name: /Gửi cho/ })).toBeNull());
  });
});
