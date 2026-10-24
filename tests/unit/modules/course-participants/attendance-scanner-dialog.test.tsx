import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { AttendanceScannerDialog } from "@/modules/course-participants/components/attendance-scanner-dialog";
import { QuickAttendanceButton } from "@/modules/course-participants/components/quick-attendance-button";
import { attendanceCourses } from "@/modules/course-participants/open-courses";
import { INITIAL_SCAN_FLOW, scanFlowReducer, type ScanFlowState } from "@/modules/course-participants/scan-flow";
import type { ScanResult } from "@/modules/course-participants/types";

vi.mock("jsqr", () => ({ default: vi.fn(() => null) }));

const envelope = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data, message: status < 400 ? null : data }), { status, headers: { "content-type": "application/json" } });

const TOKEN = "HTATT1.3f2a9c10-aaaa-bbbb.Zm9vYmFyYmF6cXV4";
const person = (status: ScanResult["status"], extra: Partial<ScanResult> = {}): ScanResult => ({ status, participationId: "p1", holyName: "Giuse", fullName: "Nguyễn An", parishName: "Bà Lụa", teamName: "Đội 1", ...extra });

function wrap(ui: React.ReactElement) {
  return render(
    <Tooltip.Provider>
      <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
    </Tooltip.Provider>,
  );
}
const open = () => wrap(<AttendanceScannerDialog courseCode="KH-1" courseName="Khóa 1" onOpenChange={() => undefined} open />);

function submit(value: string) {
  const input = screen.getByLabelText("Mã điểm danh");
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form")!);
}

type Call = { url: string; method?: string };
function mockApi(lookup: () => Response, scan: () => Response = () => envelope(person("CHECKED_IN", { checkedInAt: "2026-08-02T01:30:00Z" }))) {
  const calls: Call[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.endsWith("/attendance/lookup")) return lookup();
    if (url.endsWith("/attendance/scan")) return scan();
    return envelope({});
  });
  return calls;
}

beforeEach(() => useAuthStore.getState().setAccessToken("token"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.getState().clear();
});

describe("scanFlowReducer", () => {
  const p = person("READY");
  it("goes scanning -> looking -> confirm -> confirming -> done -> scanning", () => {
    let state: ScanFlowState = INITIAL_SCAN_FLOW;
    state = scanFlowReducer(state, { type: "scanned", token: "t" });
    expect(state).toEqual({ step: "looking", token: "t" });
    state = scanFlowReducer(state, { type: "looked-up", person: p });
    expect(state).toEqual({ step: "confirm", token: "t", person: p });
    state = scanFlowReducer(state, { type: "confirm" });
    expect(state.step).toBe("confirming");
    state = scanFlowReducer(state, { type: "confirmed", person: person("CHECKED_IN") });
    expect(state.step).toBe("done");
    expect(scanFlowReducer(state, { type: "next" })).toEqual(INITIAL_SCAN_FLOW);
  });

  it("skip returns to scanning only from the confirm step", () => {
    const confirm: ScanFlowState = { step: "confirm", token: "t", person: p };
    expect(scanFlowReducer(confirm, { type: "skip" })).toEqual(INITIAL_SCAN_FLOW);
    const confirming: ScanFlowState = { step: "confirming", token: "t", person: p };
    expect(scanFlowReducer(confirming, { type: "skip" })).toBe(confirming);
  });

  it("an already checked-in person skips the confirm step", () => {
    const state = scanFlowReducer({ step: "looking", token: "t" }, { type: "looked-up", person: person("ALREADY_CHECKED_IN") });
    expect(state.step).toBe("already");
  });

  it("ignores new scans while anything else is showing", () => {
    const confirm: ScanFlowState = { step: "confirm", token: "t", person: p };
    expect(scanFlowReducer(confirm, { type: "scanned", token: "other" })).toBe(confirm);
    const done: ScanFlowState = { step: "done", person: p };
    expect(scanFlowReducer(done, { type: "scanned", token: "other" })).toBe(done);
  });

  it("failures show an error that only Next clears", () => {
    const error = scanFlowReducer({ step: "looking", token: "t" }, { type: "failed", message: "lỗi" });
    expect(error).toEqual({ step: "error", message: "lỗi" });
    expect(scanFlowReducer(error, { type: "scanned", token: "x" })).toBe(error);
    expect(scanFlowReducer(error, { type: "next" })).toEqual(INITIAL_SCAN_FLOW);
  });

  it("stray events in the wrong step are ignored", () => {
    expect(scanFlowReducer(INITIAL_SCAN_FLOW, { type: "confirm" })).toBe(INITIAL_SCAN_FLOW);
    expect(scanFlowReducer(INITIAL_SCAN_FLOW, { type: "confirmed", person: p })).toBe(INITIAL_SCAN_FLOW);
    expect(scanFlowReducer(INITIAL_SCAN_FLOW, { type: "next" })).toBe(INITIAL_SCAN_FLOW);
  });
});

describe("AttendanceScannerDialog", () => {
  it("shows the course and falls back to manual input without a camera", async () => {
    open();
    expect(await screen.findByText(/Trình duyệt không hỗ trợ camera/)).toBeInTheDocument();
    expect(screen.getByText("Khóa 1.")).toBeInTheDocument();
  });

  it("looks the code up first and only checks in after the user confirms", async () => {
    const calls = mockApi(() => envelope(person("READY")));
    open();
    submit(`  ${TOKEN}\r\n`);
    expect(await screen.findByText("Giuse Nguyễn An")).toBeInTheDocument();
    expect(screen.getByText("Đội 1 · Bà Lụa")).toBeInTheDocument();
    expect(calls.map((call) => call.url.split("/attendance/")[1])).toEqual(["lookup"]);

    fireEvent.click(screen.getByRole("button", { name: /Xác nhận điểm danh/ }));
    expect(await screen.findByText("Giuse Nguyễn An đã điểm danh thành công")).toBeInTheDocument();
    expect(calls.map((call) => call.url.split("/attendance/")[1])).toEqual(["lookup", "scan"]);
  });

  it("Bỏ qua goes back to scanning without checking in", async () => {
    const calls = mockApi(() => envelope(person("READY")));
    open();
    submit(TOKEN);
    fireEvent.click(await screen.findByRole("button", { name: "Bỏ qua" }));
    expect(await screen.findByLabelText("Mã điểm danh")).toBeInTheDocument();
    expect(calls.some((call) => call.url.endsWith("/attendance/scan"))).toBe(false);
  });

  it("after success Quét tiếp returns to scanning for the next person", async () => {
    mockApi(() => envelope(person("READY")));
    open();
    submit(TOKEN);
    fireEvent.click(await screen.findByRole("button", { name: /Xác nhận điểm danh/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Quét tiếp/ }));
    expect(await screen.findByLabelText("Mã điểm danh")).toBeInTheDocument();
  });

  it("says when the person had already checked in and offers Quét tiếp only", async () => {
    mockApi(() => envelope(person("ALREADY_CHECKED_IN", { checkedInAt: "2026-08-02T01:30:00Z" })));
    open();
    submit(TOKEN);
    expect(await screen.findByText("Giuse Nguyễn An đã điểm danh trước đó")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xác nhận điểm danh/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Quét tiếp/ })).toBeInTheDocument();
  });

  it("shows the server message when the lookup is refused", async () => {
    mockApi(() => envelope("Mã QR này thuộc khóa huấn luyện khác", 400));
    open();
    submit(TOKEN);
    expect(await screen.findByText("Mã QR này thuộc khóa huấn luyện khác")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Quét tiếp/ }));
    expect(await screen.findByLabelText("Mã điểm danh")).toBeInTheDocument();
  });

  it("shows an error when the final check-in fails", async () => {
    mockApi(() => envelope(person("READY")), () => envelope("Hồ sơ không còn trong danh sách tham dự của khóa", 409));
    open();
    submit(TOKEN);
    fireEvent.click(await screen.findByRole("button", { name: /Xác nhận điểm danh/ }));
    expect(await screen.findByText("Hồ sơ không còn trong danh sách tham dự của khóa")).toBeInTheDocument();
  });

  it("does not call the server for text that is not an attendance code", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope({}));
    open();
    submit("https://ht.example.com/certificates/GPPC-HTI-2026-1");
    expect(await screen.findByText(/Đây là mã QR của chứng nhận/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores empty submissions", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope({}));
    open();
    submit("   ");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("attendanceCourses", () => {
  it("keeps only open regular courses with attendance on", () => {
    const rows = [
      { courseCode: "A", courseName: "Khóa A", attendanceEnabled: true, status: true, organizingStatus: "ONGOING" },
      { courseCode: "B", courseName: "Tắt điểm danh", attendanceEnabled: false },
      { courseCode: "C", attendanceEnabled: true, status: false },
      { courseCode: "D", attendanceEnabled: true, pastCourse: true },
      { courseCode: "E", attendanceEnabled: true, finishedAt: "2026-01-01T00:00:00Z" },
      { courseCode: "F", attendanceEnabled: true, organizingStatus: "ENDED" },
      { courseName: "Không mã", attendanceEnabled: true },
      { courseCode: "G", attendanceEnabled: true },
    ];
    expect(attendanceCourses(rows)).toEqual([
      { courseCode: "A", courseName: "Khóa A" },
      { courseCode: "G", courseName: "G" },
    ]);
  });
});

describe("QuickAttendanceButton", () => {
  const login = (permissions: string[], extra: object = {}) => useAuthStore.getState().setUser({ username: "u", roles: [], permissions, ...extra });

  it("is hidden without the scan permission or when the unit is locked", () => {
    login(["training.participation.read.deanery"]);
    const first = wrap(<QuickAttendanceButton />);
    expect(screen.queryByRole("button", { name: /Quét QR điểm danh nhanh/ })).toBeNull();
    first.unmount();
    login(["training.attendance.scan.deanery"], { unitLocked: true });
    wrap(<QuickAttendanceButton />);
    expect(screen.queryByRole("button", { name: /Quét QR điểm danh nhanh/ })).toBeNull();
  });

  it("lists only the open courses and opens the scanner for the chosen one", async () => {
    login(["training.attendance.scan.deanery"]);
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      urls.push(String(input));
      return envelope({ content: [{ courseCode: "KH-1", courseName: "Khóa Dự trưởng", attendanceEnabled: true, status: true }, { courseCode: "KH-2", courseName: "Khóa tắt", attendanceEnabled: false }], totalElements: 2, totalPages: 1 });
    });
    wrap(<QuickAttendanceButton />);
    fireEvent.pointerDown(screen.getByRole("button", { name: /Quét QR điểm danh nhanh/ }), { button: 0, ctrlKey: false });
    expect(await screen.findByText("Khóa Dự trưởng")).toBeInTheDocument();
    expect(screen.queryByText("Khóa tắt")).toBeNull();
    expect(urls[0]).toContain("/training/courses?");
    expect(decodeURIComponent(urls[0])).toContain("attendanceEnabled");
    fireEvent.click(screen.getByText("Khóa Dự trưởng"));
    expect(await screen.findByText("Điểm danh bằng mã QR")).toBeInTheDocument();
    expect(screen.getByText("Khóa Dự trưởng.")).toBeInTheDocument();
  });

  it("tells the user when no course is open", async () => {
    login(["training.attendance.scan.deanery"]);
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope({ content: [], totalElements: 0, totalPages: 0 }));
    wrap(<QuickAttendanceButton />);
    fireEvent.pointerDown(screen.getByRole("button", { name: /Quét QR điểm danh nhanh/ }), { button: 0, ctrlKey: false });
    expect(await screen.findByText(/Không có khóa huấn luyện nào đang mở/)).toBeInTheDocument();
  });
});
