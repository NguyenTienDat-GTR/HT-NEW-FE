import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findRoute } from "@/config/routes/routes";
import { useAuthStore } from "@/lib/auth/auth-store";
import { CourseDetailPage } from "@/modules/training-courses/components/course-detail-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
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
  attendanceEnabled: false, autoSendInvitation: false, hostYear: 2026, passingScore: 5, location: "Thủ Dầu Một",
  managementUnitType: "DIOCESE", dioceseName: "Giáo phận Phú Cường", scoreComponents: [],
  startDate: "2026-12-01", endDate: "2026-12-05",
  registrationStartAt: "2026-07-01T00:00:00+07:00", registrationEndAt: "2026-07-20T00:00:00+07:00",
};

function mockApi(course: Record<string, unknown>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input).replace("/backend/api", "");
    if (url.startsWith("/training/courses/KH-1")) return envelope(course);
    return pageOf([]);
  });
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

async function openInfo() {
  const toggle = await screen.findByRole("button", { name: /Thông tin khóa/ });
  if (toggle.getAttribute("aria-expanded") !== "true") fireEvent.click(toggle);
}

beforeEach(() => {
  useAuthStore.getState().setAccessToken("token");
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.getState().clear();
});

const login = (permissions: string[]) => useAuthStore.getState().setUser({ username: "u", roles: ["ADMIN_DEANERY"], permissions });

describe("course info: management level and owner-only score data", () => {
  it("shows the management level with the owning unit to every viewer", async () => {
    login(["training.participation.submit.parish", "training.participation.read.parish"]);
    mockApi({ ...baseCourse, viewerOwnsCourse: false, passingScore: null, scoreComponents: null });
    renderPage();
    await openInfo();

    expect(await screen.findByText("Cấp quản lý")).toBeTruthy();
    expect(screen.getByText("Giáo phận · Giáo phận Phú Cường")).toBeTruthy();
  });

  it("hides the passing score and the score components from a unit that does not own the course", async () => {
    login(["training.course.read.deanery", "training.participation.submit.parish"]);
    mockApi({ ...baseCourse, viewerOwnsCourse: false, passingScore: null, scoreComponents: null });
    renderPage();
    await openInfo();
    await screen.findByText("Cấp quản lý");

    expect(screen.queryByText("Điểm đạt")).toBeNull();
    expect(screen.queryByText("Thành phần điểm của khóa")).toBeNull();
    expect(screen.queryByText("Cấu hình")).toBeNull();
    expect(screen.queryByText("Bật điểm danh bằng QR")).toBeNull();
  });

  it("shows the passing score and the score components to the owning unit", async () => {
    login(["training.course.read.diocese"]);
    mockApi({ ...baseCourse, viewerOwnsCourse: true });
    renderPage();
    await openInfo();

    await waitFor(() => expect(screen.getByText("Điểm đạt")).toBeTruthy());
    expect(screen.getByText("Thành phần điểm của khóa")).toBeTruthy();
    expect(screen.getByText("Bật điểm danh bằng QR")).toBeTruthy();
  });

  it("wraps a long location onto several lines instead of truncating it", async () => {
    login(["training.course.read.diocese"]);
    const location = "Trung tâm mục vụ Phú Cường, số 1 đường Võ Thị Sáu, phường Phú Cường, thành phố Thủ Dầu Một";
    mockApi({ ...baseCourse, location, viewerOwnsCourse: true });
    renderPage();
    await openInfo();

    const value = await screen.findByText(location);
    expect(value.className).not.toContain("line-clamp");
    expect(value.className).toContain("whitespace-pre-wrap");
  });

  it("names the deanery for a course managed by a deanery", async () => {
    login(["training.course.read.deanery"]);
    mockApi({ ...baseCourse, managementUnitType: "DEANERY", deaneryName: "Giáo hạt Lái Thiêu", viewerOwnsCourse: true });
    renderPage();
    await openInfo();

    expect(await screen.findByText("Giáo hạt · Giáo hạt Lái Thiêu")).toBeTruthy();
  });
});
