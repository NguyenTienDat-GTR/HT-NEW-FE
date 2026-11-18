import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { HeaderScanButton } from "@/modules/qr-scan/components/header-scan-button";
import { AttendanceScannerDialog } from "@/modules/course-participants/components/attendance-scanner-dialog";
import { INITIAL_SCAN_FLOW, scanFlowReducer, type ScanFlowState } from "@/modules/course-participants/scan-flow";
import type { ScanResult } from "@/modules/course-participants/types";

vi.mock("jsqr", () => ({ default: vi.fn(() => null) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn(), message: vi.fn() } }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const envelope = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data, message: status < 400 ? null : data }), { status, headers: { "content-type": "application/json" } });

const TOKEN = "HTATT2.KH-1.3f2a9c10-aaaa-bbbb.Zm9vYmFyYmF6cXV4";
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

describe("header scanner (no course chosen)", () => {
  const openHeader = () => wrap(<AttendanceScannerDialog onOpenChange={() => undefined} open />);
  const CERT_URL = "https://ht.example.com/certificates/GPPC-HTI-2026-1";

  beforeEach(() => push.mockClear());

  it("checks attendance through the course-less endpoint and shows which course it belongs to", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      urls.push(String(input));
      return String(input).endsWith("/lookup") ? envelope(person("READY", { courseCode: "KH-1", courseName: "Khóa Dự trưởng" })) : envelope(person("CHECKED_IN", { courseName: "Khóa Dự trưởng" }));
    });
    openHeader();
    submit(TOKEN);
    expect(await screen.findByText("Khóa: Khóa Dự trưởng")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận điểm danh/ }));
    expect(await screen.findByText("Giuse Nguyễn An đã điểm danh thành công")).toBeInTheDocument();
    expect(urls.map((url) => url.split("/training/")[1])).toEqual(["attendance/lookup", "attendance/scan"]);
  });

  it("shows the server message when the course is not running", async () => {
    mockApi(() => envelope("Khóa huấn luyện đã kết thúc nên không thể điểm danh", 409));
    openHeader();
    submit(TOKEN);
    expect(await screen.findByText(/đã kết thúc nên không thể điểm danh/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("opens the certificate detail page straight away when the certificate exists", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      urls.push(String(input));
      return envelope({ certificateCode: "GPPC-HTI-2026-1", approvalStatus: "APPROVED" });
    });
    openHeader();
    submit(CERT_URL);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/certificates/GPPC-HTI-2026-1"));
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("/certificates/GPPC-HTI-2026-1");
  });

  it("still opens the detail page for a revoked certificate", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope({ certificateCode: "GPPC-HTI-2026-1", approvalStatus: "REVOKED" }));
    openHeader();
    submit(CERT_URL);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/certificates/GPPC-HTI-2026-1"));
  });

  it("reports a missing certificate on the spot and does not navigate", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope("Không tìm thấy chứng nhận", 404));
    openHeader();
    submit(CERT_URL);
    expect(await screen.findByText(/Không tìm thấy chứng nhận GPPC-HTI-2026-1/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Quét tiếp/ }));
    expect(await screen.findByLabelText("Mã điểm danh")).toBeInTheDocument();
  });

  it("asks for a new code when the old attendance format is scanned", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope({}));
    openHeader();
    submit("HTATT1.p1.AAAAAAAAAAAAAAAAAAAAAA");
    expect(await screen.findByText(/phiên bản cũ/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects codes that are neither attendance nor certificate", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope({}));
    openHeader();
    submit("https://evil.example.com/login");
    expect(await screen.findByText(/không phải mã điểm danh hay mã chứng nhận/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("HeaderScanButton", () => {
  const login = (permissions: string[], extra: object = {}) => useAuthStore.getState().setUser({ username: "u", roles: [], permissions, ...extra });
  const name = /Quét mã QR/;

  it("shows for attendance scanners or certificate readers and hides otherwise", () => {
    login(["training.participation.read.deanery"]);
    const first = wrap(<HeaderScanButton />);
    expect(screen.queryByRole("button", { name })).toBeNull();
    first.unmount();
    login(["training.attendance.scan.deanery"], { unitLocked: true });
    const second = wrap(<HeaderScanButton />);
    expect(screen.queryByRole("button", { name })).toBeNull();
    second.unmount();
    login(["training.attendance.scan.deanery"]);
    const third = wrap(<HeaderScanButton />);
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
    third.unmount();
    login(["training.certificate.read.diocese"], { unitLocked: true });
    wrap(<HeaderScanButton />);
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("opens the combined scanner", async () => {
    login(["training.certificate.read.diocese"]);
    wrap(<HeaderScanButton />);
    fireEvent.click(screen.getByRole("button", { name }));
    expect(await screen.findByText(/mã QR trên chứng nhận để mở trang chi tiết/)).toBeInTheDocument();
  });
});

describe("lệ phí ở màn quét", () => {
  const feePerson = (status: ScanResult["status"], extra: Partial<ScanResult> = {}) =>
    person(status, { courseCode: "KH-1", courseName: "Khóa 1", feeEnabled: true, feeAmount: 150000, feePaidAt: null, ...extra });
  const paidButton = () => screen.getByRole("button", { name: /Đã đóng tiền/ });

  type FeeCall = { url: string; paid: boolean };
  function mockFeeApi(lookupPerson: ScanResult, feeResponse: (call: FeeCall) => Response = (call) => envelope({ participationId: "p1", feePaid: call.paid, feePaidAt: call.paid ? "2026-11-18T01:00:00Z" : null, feePaidBy: "admin" })) {
    const feeCalls: FeeCall[] = [];
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/fee") && init?.method === "PUT") {
        const call = { url: url.replace("/backend/api", ""), paid: (JSON.parse(String(init.body)) as { paid: boolean }).paid };
        feeCalls.push(call);
        return feeResponse(call);
      }
      calls.push(url.split("/attendance/")[1] ?? url);
      if (url.endsWith("/attendance/lookup")) return envelope(lookupPerson);
      if (url.endsWith("/attendance/scan")) return envelope({ ...lookupPerson, status: "CHECKED_IN", checkedInAt: "2026-11-18T01:30:00Z" });
      return envelope({});
    });
    return { feeCalls, calls };
  }

  beforeEach(() => vi.mocked(toast.error).mockClear());

  it("hiện số tiền và nút Đã đóng tiền ở bước xác nhận khi khóa thu lệ phí", async () => {
    mockFeeApi(feePerson("READY"));
    open();
    submit(TOKEN);
    expect(await screen.findByText("150.000 ₫")).toBeInTheDocument();
    expect(paidButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("khóa không thu lệ phí thì không có phần lệ phí", async () => {
    mockFeeApi(feePerson("READY", { feeEnabled: false, feeAmount: null }));
    open();
    submit(TOKEN);
    await screen.findByText("Giuse Nguyễn An");
    expect(screen.queryByText("Lệ phí")).toBeNull();
    expect(screen.queryByRole("button", { name: /Đã đóng tiền/ })).toBeNull();
  });

  it("bấm Đã đóng tiền là lưu ngay (trạng thái đích) mà không cần điểm danh, chạm lại để bỏ", async () => {
    const { feeCalls, calls } = mockFeeApi(feePerson("READY"));
    open();
    submit(TOKEN);
    await screen.findByText("150.000 ₫");

    fireEvent.click(paidButton());
    expect(paidButton()).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(feeCalls).toEqual([{ url: "/training/courses/KH-1/attendance/participants/p1/fee", paid: true }]));
    expect(calls).toEqual(["lookup"]);
    expect(toast.error).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 400));
    fireEvent.click(paidButton());
    expect(paidButton()).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(feeCalls.map((call) => call.paid)).toEqual([true, false]));
  });

  it("trạng thái vẫn giữ nguyên sau khi hàng đợi rảnh và làm mới dữ liệu (không tự quay về như tra cứu cũ)", async () => {
    const { feeCalls } = mockFeeApi(feePerson("READY"));
    open();
    submit(TOKEN);
    await screen.findByText("150.000 ₫");

    fireEvent.click(paidButton());
    await waitFor(() => expect(feeCalls).toHaveLength(1));
    // Hàng đợi rảnh sau 600ms rồi làm mới dữ liệu: kết quả tra cứu cũ của màn quét vẫn nói "chưa đóng".
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(paidButton()).toHaveAttribute("aria-pressed", "true");

    // Bỏ tích cũng không bị quay lại sau khi rảnh.
    fireEvent.click(paidButton());
    await waitFor(() => expect(feeCalls.map((call) => call.paid)).toEqual([true, false]));
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(paidButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("người đã đóng từ trước hiện sẵn trạng thái đã đóng", async () => {
    mockFeeApi(feePerson("READY", { feePaidAt: "2026-11-17T01:00:00Z" }));
    open();
    submit(TOKEN);
    await screen.findByText("150.000 ₫");
    expect(paidButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("vẫn ghi nhận được sau khi điểm danh xong và với người đã điểm danh trước đó", async () => {
    const { feeCalls } = mockFeeApi(feePerson("READY"));
    open();
    submit(TOKEN);
    fireEvent.click(await screen.findByRole("button", { name: /Xác nhận điểm danh/ }));
    expect(await screen.findByText("Giuse Nguyễn An đã điểm danh thành công")).toBeInTheDocument();
    expect(paidButton()).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(paidButton());
    await waitFor(() => expect(feeCalls).toHaveLength(1));
    cleanup();

    mockFeeApi(feePerson("ALREADY_CHECKED_IN", { checkedInAt: "2026-11-18T01:30:00Z" }));
    open();
    submit(TOKEN);
    expect(await screen.findByText("Giuse Nguyễn An đã điểm danh trước đó")).toBeInTheDocument();
    expect(paidButton()).toBeInTheDocument();
  });

  it("lưu lỗi thì trả nút về như cũ và báo lỗi, không mất người đang quét", async () => {
    mockFeeApi(feePerson("READY"), () => envelope("Khóa đã kết thúc nên không thể cập nhật lệ phí", 409));
    open();
    submit(TOKEN);
    await screen.findByText("150.000 ₫");
    fireEvent.click(paidButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe("Không lưu được lệ phí của Giuse Nguyễn An: Khóa đã kết thúc nên không thể cập nhật lệ phí");
    await waitFor(() => expect(paidButton()).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByText("Giuse Nguyễn An")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xác nhận điểm danh/ })).toBeInTheDocument();
  });

  it("nút quét ở header lấy khóa từ kết quả quét để ghi nhận lệ phí", async () => {
    const { feeCalls } = mockFeeApi(feePerson("READY", { courseCode: "KH-9" }));
    wrap(<AttendanceScannerDialog onOpenChange={() => undefined} open />);
    submit(TOKEN);
    await screen.findByText("150.000 ₫");
    fireEvent.click(paidButton());
    await waitFor(() => expect(feeCalls).toEqual([{ url: "/training/courses/KH-9/attendance/participants/p1/fee", paid: true }]));
  });
});
