import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { AutoSendBanner } from "@/modules/course-participants/components/auto-send-banner";
import { BadgeExportDialog } from "@/modules/course-participants/components/badge-export-dialog";
import { CourseParticipantsHub } from "@/modules/course-participants/components/course-participants-hub";
import { InvitationDialog } from "@/modules/course-participants/components/invitation-dialog";
import { InvitationResultDialog } from "@/modules/course-participants/components/invitation-result-dialog";
import { InvitationStatus, ParticipantsTable } from "@/modules/course-participants/components/participants-table";
import type { InvitationResult, ParticipantRow, UsableBadgeConfig } from "@/modules/course-participants/types";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn(), message: vi.fn() } }));
vi.mock("jsqr", () => ({ default: vi.fn(() => null) }));

const envelope = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { headers: { "content-type": "application/json" } });
const pageOf = (content: unknown[]) => envelope({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, size: 20, number: 0, first: true, last: true });

const rowAn: ParticipantRow = { id: "p1", holyName: "Giuse", fullName: "Nguyễn An", parishName: "Bà Lụa", deaneryName: "Thủ Dầu Một", teamName: "Đội 1", email: "an@x.vn", invitationSentAt: "2026-08-01T08:00:00Z", checkedInAt: "2026-08-02T01:00:00Z" };
const rowBinh: ParticipantRow = { id: "p2", holyName: "Maria", fullName: "Trần Bình", parishName: "Búng", deaneryName: "Thủ Dầu Một", teamName: null, email: "", emailProblem: "Hồ sơ chưa có email" };
const rowChi: ParticipantRow = { id: "p3", holyName: "Anna", fullName: "Lê Chi", email: "sai", emailProblem: "Email không hợp lệ: sai", invitationError: "Email không hợp lệ: sai" };

function wrap(ui: React.ReactElement) {
  return render(
    <Tooltip.Provider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
    </Tooltip.Provider>,
  );
}

beforeEach(() => {
  useAuthStore.getState().setAccessToken("token");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.getState().clear();
});

describe("InvitationStatus", () => {
  it("shows sent, failed, missing and pending states", () => {
    const { rerender } = render(<InvitationStatus row={rowAn} />);
    expect(screen.getByText(/Đã gửi/)).toBeInTheDocument();
    rerender(<InvitationStatus row={rowChi} />);
    expect(screen.getByText("Email không hợp lệ: sai")).toBeInTheDocument();
    rerender(<InvitationStatus row={rowBinh} />);
    expect(screen.getByText("Chưa có email")).toBeInTheDocument();
    rerender(<InvitationStatus row={{ ...rowBinh, emailProblem: "Email không hợp lệ: x" }} />);
    expect(screen.getByText("Email sai định dạng")).toBeInTheDocument();
    rerender(<InvitationStatus row={{ id: "p9", fullName: "X", email: "x@x.vn" }} />);
    expect(screen.getByText("Chưa gửi")).toBeInTheDocument();
  });

  it("gửi lỗi được ưu tiên hiển thị hơn đã gửi trước đó", () => {
    render(<InvitationStatus row={{ ...rowAn, invitationError: "Không gửi được email: 550" }} />);
    expect(screen.getByText("Không gửi được email: 550")).toBeInTheDocument();
    expect(screen.queryByText(/Đã gửi/)).toBeNull();
  });
});

describe("ParticipantsTable", () => {
  const baseProps = { loading: false, selected: new Set<string>(), togglingId: null, onToggleRow: () => undefined, onToggleAll: () => undefined, onToggleCheckedIn: () => undefined, onOpenDetail: () => undefined };

  it("renders names, teams and check-in state when attendance is enabled", () => {
    render(<ParticipantsTable {...baseProps} attendanceEnabled canManage rows={[rowAn, rowBinh]} />);
    expect(screen.getByText("Giuse Nguyễn An")).toBeInTheDocument();
    expect(screen.getByText("Đội 1")).toBeInTheDocument();
    expect(screen.getByText("Chưa chia đội")).toBeInTheDocument();
    expect(screen.getByText("Chưa điểm danh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bỏ điểm danh Nguyễn An" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Điểm danh Trần Bình" })).toBeInTheDocument();
  });

  it("hides the attendance column when the course has attendance off", () => {
    render(<ParticipantsTable {...baseProps} attendanceEnabled={false} canManage rows={[rowAn]} />);
    expect(screen.queryByText("Điểm danh")).toBeNull();
    expect(screen.queryByRole("button", { name: /điểm danh/i })).toBeNull();
  });

  it("does not offer manual check-in to users who cannot manage", () => {
    render(<ParticipantsTable {...baseProps} attendanceEnabled canManage={false} rows={[rowBinh]} />);
    expect(screen.queryByRole("button", { name: /Điểm danh Trần Bình/ })).toBeNull();
    expect(screen.getByText("Chưa điểm danh")).toBeInTheDocument();
  });

  it("reports selection and manual check-in", () => {
    const onToggleRow = vi.fn();
    const onToggleAll = vi.fn();
    const onToggleCheckedIn = vi.fn();
    render(<ParticipantsTable {...baseProps} attendanceEnabled canManage onToggleAll={onToggleAll} onToggleCheckedIn={onToggleCheckedIn} onToggleRow={onToggleRow} rows={[rowBinh]} />);
    fireEvent.click(screen.getByLabelText("Chọn Trần Bình"));
    expect(onToggleRow).toHaveBeenCalledWith("p2");
    fireEvent.click(screen.getByLabelText("Chọn tất cả hồ sơ trong trang"));
    expect(onToggleAll).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Điểm danh Trần Bình" }));
    expect(onToggleCheckedIn).toHaveBeenCalledWith(rowBinh);
  });

  it("shows empty and loading states", () => {
    const { rerender } = render(<ParticipantsTable {...baseProps} attendanceEnabled={false} canManage={false} rows={[]} />);
    expect(screen.getByText("Không có hồ sơ nào phù hợp.")).toBeInTheDocument();
    rerender(<ParticipantsTable {...baseProps} attendanceEnabled={false} canManage={false} loading rows={[]} />);
    expect(screen.getByText("Đang tải danh sách…")).toBeInTheDocument();
  });

  it("marks every row as selected when the header box is ticked", () => {
    render(<ParticipantsTable {...baseProps} attendanceEnabled={false} canManage={false} rows={[rowAn, rowBinh]} selected={new Set(["p1", "p2"])} />);
    expect(screen.getByLabelText("Chọn tất cả hồ sơ trong trang")).toBeChecked();
  });
});

describe("InvitationDialog", () => {
  const summary = { total: 10, sent: 4, pending: 6, withoutEmail: 2 };

  function open(props: Partial<React.ComponentProps<typeof InvitationDialog>> = {}) {
    const onSend = vi.fn();
    render(<InvitationDialog attendanceEnabled onOpenChange={() => undefined} onSend={onSend} open pending={false} selectedIds={[]} summary={summary} {...props} />);
    return onSend;
  }

  it("sends to everyone with the QR on by default when attendance is enabled", () => {
    const onSend = open();
    expect(screen.getByText(/Gửi cho cả danh sách tham dự \(10 hồ sơ\)/)).toBeInTheDocument();
    expect(screen.getByText(/2 hồ sơ chưa có email hoặc email sai định dạng/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Gửi email/ }));
    expect(onSend).toHaveBeenCalledWith({ participationIds: undefined, includeQr: true, resend: false });
  });

  it("disables the QR option when attendance is off and never requests it", () => {
    const onSend = open({ attendanceEnabled: false });
    const qr = screen.getByLabelText(/Kèm mã QR điểm danh/);
    expect(qr).toBeDisabled();
    expect(qr).not.toBeChecked();
    expect(screen.getByText(/Phải bật điểm danh trong cấu hình khóa/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Gửi email/ }));
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ includeQr: false }));
  });

  it("lets the user turn the QR off and resend to already-sent participants", () => {
    const onSend = open();
    fireEvent.click(screen.getByLabelText(/Kèm mã QR điểm danh/));
    fireEvent.click(screen.getByLabelText(/Gửi lại cả hồ sơ đã được gửi/));
    fireEvent.click(screen.getByRole("button", { name: /Gửi email/ }));
    expect(onSend).toHaveBeenCalledWith({ participationIds: undefined, includeQr: false, resend: true });
  });

  it("targets only the selected participants", () => {
    const onSend = open({ selectedIds: ["a", "b", "c"] });
    expect(screen.getByText("Gửi cho 3 hồ sơ đã chọn")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Gửi email/ }));
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ participationIds: ["a", "b", "c"] }));
  });

  it("explains that everything was already sent and offers resend", () => {
    open({ summary: { total: 5, sent: 5, pending: 0, withoutEmail: 0 } });
    expect(screen.getByText(/Mọi hồ sơ trong phạm vi này đã được gửi/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Gửi lại cả hồ sơ đã được gửi/));
    expect(screen.queryByText(/Mọi hồ sơ trong phạm vi này đã được gửi/)).toBeNull();
  });

  it("cannot send when there is nobody to send to", () => {
    open({ summary: { total: 0, sent: 0, pending: 0, withoutEmail: 0 } });
    expect(screen.getByRole("button", { name: /Gửi email/ })).toBeDisabled();
  });
});

describe("InvitationResultDialog", () => {
  const result: InvitationResult = {
    total: 6,
    sent: 3,
    skippedAlreadySent: 1,
    failed: 2,
    includeQr: true,
    issues: [
      { participationId: "p2", holyName: "Maria", fullName: "Trần Bình", email: "", reason: "Hồ sơ chưa có email" },
      { participationId: "p3", holyName: "Anna", fullName: "Lê Chi", email: "sai", reason: "Email không hợp lệ: sai" },
    ],
  };

  it("summarises the outcome and lists every problem hồ sơ by group", () => {
    render(<InvitationResultDialog onClose={() => undefined} result={result} />);
    expect(screen.getByText("Đã gửi 3 email, 2 hồ sơ chưa gửi được")).toBeInTheDocument();
    expect(screen.getByText(/1 hồ sơ đã được gửi trước đó nên bỏ qua/)).toBeInTheDocument();
    expect(screen.getByText("Chưa có email (1)")).toBeInTheDocument();
    expect(screen.getByText("Email sai định dạng (1)")).toBeInTheDocument();
    expect(screen.getByText("Maria Trần Bình")).toBeInTheDocument();
    expect(screen.getByText("Anna Lê Chi")).toBeInTheDocument();
    expect(screen.getByText(/có kèm mã QR điểm danh/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tải danh sách lỗi/ })).toBeEnabled();
  });

  it("has nothing to download when everything went out", () => {
    render(<InvitationResultDialog onClose={() => undefined} result={{ total: 2, sent: 2, skippedAlreadySent: 0, failed: 0, includeQr: false, issues: [] }} />);
    expect(screen.getByText("Đã gửi 2 email thông tin tham dự")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tải danh sách lỗi/ })).toBeDisabled();
    expect(screen.getByText(/không kèm mã QR/)).toBeInTheDocument();
  });

  it("renders nothing while there is no result", () => {
    render(<InvitationResultDialog onClose={() => undefined} result={null} />);
    expect(screen.queryByText("Kết quả gửi email thông tin tham dự")).toBeNull();
  });

  it("closes through the close button", () => {
    const onClose = vi.fn();
    render(<InvitationResultDialog onClose={onClose} result={result} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Đóng" })[0]);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("BadgeExportDialog", () => {
  const configs: UsableBadgeConfig[] = [
    { id: "c1", name: "Thẻ chung", isDefault: true, applied: true, scopeLevel: "DEANERY", hasBack: true, cardWidthMm: 90, cardHeightMm: 55, cardsPerPage: 10, paperSize: "A4", paperOrientation: "PORTRAIT" },
    { id: "c2", name: "Thẻ một mặt", isDefault: false, applied: false, scopeLevel: "DIOCESE", hasBack: false, cardWidthMm: 100, cardHeightMm: 70, cardsPerPage: 6, paperSize: "A4", paperOrientation: "PORTRAIT" },
  ];

  function open(props: Partial<React.ComponentProps<typeof BadgeExportDialog>> = {}) {
    const onExport = vi.fn();
    wrap(<BadgeExportDialog courseCode="KH-1" onExport={onExport} onOpenChange={() => undefined} open pending={false} selectedIds={[]} teams={["Đội 1", "Đội 2"]} totalParticipants={25} {...props} />);
    return onExport;
  }

  it("uses the applied configuration by default and estimates the page count including backs", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(configs));
    const onExport = open();
    await screen.findByText(/Cấu hình chung: Thẻ chung/);
    expect(screen.getByText(/25 thẻ/)).toBeInTheDocument();
    expect(screen.getByText(/6 trang/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Xuất cả mặt sau/)).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Xuất PDF/ }));
    expect(onExport).toHaveBeenCalledWith({ configId: undefined, participationIds: undefined, teamName: undefined, includeBack: true, flipEdge: "LONG" });
  });

  it("drops the page estimate by half when the back side is turned off", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(configs));
    const onExport = open();
    await screen.findByText(/Cấu hình chung: Thẻ chung/);
    fireEvent.click(screen.getByLabelText(/Xuất cả mặt sau/));
    expect(screen.getByText(/3 trang/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Xuất PDF/ }));
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ includeBack: false }));
  });

  it("offers the flip edge only for two-sided configurations", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(configs));
    open();
    await screen.findByText(/Cấu hình chung: Thẻ chung/);
    expect(screen.getByLabelText("Cạnh lật khi in hai mặt")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cạnh lật khi in hai mặt"), { target: { value: "SHORT" } });
    expect(screen.getByText(/hàng trên ↔ dưới/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cấu hình thẻ"), { target: { value: "c2" } });
    expect(screen.queryByLabelText("Cạnh lật khi in hai mặt")).toBeNull();
    expect(screen.queryByLabelText(/Xuất cả mặt sau/)).toBeNull();
  });

  it("sends the chosen configuration and team", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(configs));
    const onExport = open({ totalParticipants: 12 });
    await screen.findByText(/Cấu hình chung: Thẻ chung/);
    fireEvent.change(screen.getByLabelText("Cấu hình thẻ"), { target: { value: "c2" } });
    fireEvent.change(screen.getByLabelText("Đội"), { target: { value: "Đội 2" } });
    fireEvent.click(screen.getByRole("button", { name: /Xuất PDF/ }));
    expect(onExport).toHaveBeenCalledWith({ configId: "c2", participationIds: undefined, teamName: "Đội 2", includeBack: true, flipEdge: "LONG" });
  });

  it("exports only the selected participants and ignores the team filter", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(configs));
    const onExport = open({ selectedIds: ["a", "b"] });
    await screen.findByText(/Cấu hình chung: Thẻ chung/);
    expect(screen.getByLabelText("Đội")).toBeDisabled();
    expect(screen.getByText(/2 thẻ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Xuất PDF/ }));
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ participationIds: ["a", "b"], teamName: undefined }));
  });

  it("warns and blocks export when no configuration exists", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope([]));
    open();
    await screen.findByText(/Chưa có cấu hình thẻ tham dự nào dùng được cho khóa này/);
    expect(screen.getByRole("button", { name: /Xuất PDF/ })).toBeDisabled();
  });

  it("blocks export when the course has nobody", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(configs));
    open({ totalParticipants: 0 });
    await screen.findByText(/Cấu hình chung: Thẻ chung/);
    expect(screen.getByRole("button", { name: /Xuất PDF/ })).toBeDisabled();
  });

  it("shows an error when the configuration list cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ success: false, message: "lỗi" }), { status: 500 }));
    open();
    await screen.findByText(/Không tải được danh sách cấu hình thẻ/);
  });
});

describe("AutoSendBanner", () => {
  const summary = (overrides: Record<string, unknown> = {}) => ({
    courseCode: "KH-1", attendanceEnabled: true, autoSendInvitation: true, totalParticipants: 10, checkedIn: 0, notCheckedIn: 10,
    invitationSent: 4, invitationPending: 6, invitationFailed: 0, withoutEmail: 1, ...overrides,
  });

  it("offers to send to the reachable hồ sơ that were approved before the flag was on", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(summary()));
    wrap(<AutoSendBanner attendanceEnabled courseCode="KH-1" courseName="Khóa 1" />);
    expect(await screen.findByText(/Còn/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi cho 5 hồ sơ" })).toBeInTheDocument();
    expect(screen.getByText(/kèm mã QR điểm danh/)).toBeInTheDocument();
  });

  it("stays hidden when everything reachable was already sent", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(summary({ invitationPending: 1, withoutEmail: 1 })));
    wrap(<AutoSendBanner attendanceEnabled courseCode="KH-1" />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole("button", { name: /Gửi cho/ })).toBeNull();
  });

  it("can be postponed", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => envelope(summary()));
    wrap(<AutoSendBanner attendanceEnabled={false} courseCode="KH-1" />);
    await screen.findByRole("button", { name: "Gửi cho 5 hồ sơ" });
    expect(screen.queryByText(/kèm mã QR điểm danh/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Để sau" }));
    expect(screen.queryByRole("button", { name: /Gửi cho/ })).toBeNull();
  });

  it("sends without resend, with QR only when attendance is enabled, then reports the result", async () => {
    const bodies: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/invitations/send")) {
        bodies.push(JSON.parse(String(init?.body)));
        return envelope({ jobId: "j1", status: "PENDING" });
      }
      if (url.includes("/invitations/jobs/j1")) {
        return envelope({ jobId: "j1", status: "DONE", result: { total: 6, sent: 5, skippedAlreadySent: 0, failed: 1, includeQr: true, issues: [{ fullName: "Hồ Sơ Lỗi", reason: "Hồ sơ chưa có email" }] } });
      }
      return envelope(summary());
    });
    wrap(<AutoSendBanner attendanceEnabled courseCode="KH-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Gửi cho 5 hồ sơ" }));
    await screen.findByText("Kết quả gửi email thông tin tham dự", undefined, { timeout: 5000 });
    expect(bodies).toEqual([{ includeQr: true, resend: false }]);
    expect(screen.getByText("Đã gửi 5 email, 1 hồ sơ chưa gửi được")).toBeInTheDocument();
    expect(screen.getByText("Hồ Sơ Lỗi")).toBeInTheDocument();
  });
});

describe("CourseParticipantsHub", () => {
  const course = { courseCode: "KH-1", courseName: "Khóa 1", attendanceEnabled: true, autoSendInvitation: false, disabled: false, finished: false, canManage: true, canScan: true };
  const summary = { courseCode: "KH-1", attendanceEnabled: true, autoSendInvitation: false, totalParticipants: 3, checkedIn: 1, notCheckedIn: 2, invitationSent: 1, invitationPending: 2, invitationFailed: 1, withoutEmail: 2 };

  function mockApi(urls: string[] = []) {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/attendance/summary")) return envelope(summary);
      if (url.includes("/attendance/participants")) return pageOf([rowAn, rowBinh, rowChi]);
      if (url.includes("/teams/options")) return envelope([{ teamName: "Đội 1" }, { teamName: "Đội 2" }]);
      if (url.includes("/badges/configs")) return envelope([]);
      return envelope({});
    });
  }

  it("shows the summary cards and the participant rows", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={course} search="" />);
    expect(await screen.findByText("Giuse Nguyễn An")).toBeInTheDocument();
    expect(screen.getAllByText("1/3")).toHaveLength(2);
    expect(screen.getByText("2 chưa điểm danh")).toBeInTheDocument();
    expect(screen.getAllByText("Gửi lỗi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thiếu / sai email").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Quét QR điểm danh/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gửi email/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xuất thẻ/ })).toBeInTheDocument();
  });

  it("explains attendance is off and hides the scanner and the check-in filter", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={{ ...course, attendanceEnabled: false }} search="" />);
    await screen.findByText("Giuse Nguyễn An");
    expect(screen.getByText(/Khóa chưa bật điểm danh nên chưa quét được mã QR/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Quét QR điểm danh/ })).toBeNull();
    expect(screen.queryByLabelText("Lọc theo điểm danh")).toBeNull();
    expect(screen.getByText("Khóa chưa bật điểm danh")).toBeInTheDocument();
  });

  it("read-only users can export cards but not send emails or scan", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={{ ...course, canManage: false, canScan: false }} search="" />);
    await screen.findByText("Giuse Nguyễn An");
    expect(screen.getByRole("button", { name: /Xuất thẻ/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gửi email/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Quét QR điểm danh/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Điểm danh Trần Bình/ })).toBeNull();
  });

  it("finished or disabled courses block sending and scanning", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={{ ...course, finished: true }} search="" />);
    await screen.findByText("Giuse Nguyễn An");
    expect(screen.getByText(/Khóa đã kết thúc hoặc bị vô hiệu hóa/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gửi email/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Quét QR điểm danh/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Xuất thẻ/ })).toBeInTheDocument();
  });

  it("sends filters to the server and resets to the first page", async () => {
    const urls: string[] = [];
    mockApi(urls);
    wrap(<CourseParticipantsHub course={course} search="" />);
    await screen.findByText("Giuse Nguyễn An");
    await waitFor(() => expect(screen.getByLabelText("Lọc theo đội")).toBeInTheDocument());
    await waitFor(() => expect(within(screen.getByLabelText("Lọc theo đội")).getAllByRole("option").length).toBeGreaterThan(1));

    fireEvent.change(screen.getByLabelText("Lọc theo đội"), { target: { value: "Đội 2" } });
    fireEvent.change(screen.getByLabelText("Lọc theo email"), { target: { value: "FAILED" } });
    fireEvent.change(screen.getByLabelText("Lọc theo điểm danh"), { target: { value: "false" } });

    await waitFor(() => {
      const last = urls.filter((url) => url.includes("/attendance/participants")).at(-1) ?? "";
      expect(last).toContain("team=%C4%90%E1%BB%99i+2");
      expect(last).toContain("invitation=FAILED");
      expect(last).toContain("checkedIn=false");
      expect(last).toContain("page=0");
    });
    expect(screen.getByRole("button", { name: /Xóa lọc \(3\)/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Xóa lọc \(3\)/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Xóa lọc/ })).toBeNull());
  });

  it("passes the shared course search box to the server", async () => {
    const urls: string[] = [];
    mockApi(urls);
    wrap(<CourseParticipantsHub course={course} search="Bà Lụa" />);
    await screen.findByText("Giuse Nguyễn An");
    expect(urls.some((url) => url.includes("/attendance/participants") && url.includes("search=B%C3%A0+L%E1%BB%A5a"))).toBe(true);
  });

  it("selection feeds the toolbar buttons and can be cleared", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={course} search="" />);
    await screen.findByText("Giuse Nguyễn An");
    fireEvent.click(screen.getByLabelText("Chọn Nguyễn An"));
    fireEvent.click(screen.getByLabelText("Chọn Trần Bình"));
    expect(screen.getByRole("button", { name: "Xuất thẻ (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi email (2)" })).toBeInTheDocument();
    expect(screen.getByText(/đã chọn 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn (2)" }));
    expect(screen.getByRole("button", { name: "Xuất thẻ" })).toBeInTheDocument();
  });

  it("manual check-in calls the API and refreshes the list", async () => {
    const calls: { url: string; method?: string; body?: string }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, method: init?.method, body: init?.body ? String(init.body) : undefined });
      if (url.includes("/attendance/participants/p2")) return envelope({ status: "CHECKED_IN", participationId: "p2", fullName: "Trần Bình" });
      if (url.includes("/attendance/summary")) return envelope(summary);
      if (url.includes("/attendance/participants")) return pageOf([rowAn, rowBinh]);
      return envelope([]);
    });
    wrap(<CourseParticipantsHub course={course} search="" />);
    fireEvent.click(await screen.findByRole("button", { name: "Điểm danh Trần Bình" }));
    await waitFor(() => expect(calls.some((call) => call.method === "PUT" && call.url.includes("/attendance/participants/p2"))).toBe(true));
    expect(JSON.parse(calls.find((call) => call.method === "PUT")?.body ?? "{}")).toEqual({ checkedIn: true });
    // Bỏ điểm danh khi hồ sơ đã điểm danh.
    fireEvent.click(await screen.findByRole("button", { name: "Bỏ điểm danh Nguyễn An" }));
    await waitFor(() => expect(calls.filter((call) => call.method === "PUT")).toHaveLength(2));
    expect(JSON.parse(calls.filter((call) => call.method === "PUT")[1].body ?? "{}")).toEqual({ checkedIn: false });
  });

  it("opens the email and export dialogs from the toolbar", async () => {
    mockApi();
    wrap(<CourseParticipantsHub course={course} search="" />);
    await screen.findByText("Giuse Nguyễn An");
    fireEvent.click(screen.getByRole("button", { name: /Gửi email/ }));
    expect(await screen.findByText("Gửi email thông tin tham dự")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Hủy" })[0]);
    await waitFor(() => expect(screen.queryByText("Gửi email thông tin tham dự")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Xuất thẻ/ }));
    expect(await screen.findByText("Xuất thẻ tham dự")).toBeInTheDocument();
  });

  it("shows the server error when the list cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/attendance/participants")
        ? new Response(JSON.stringify({ success: false, message: "Bạn không có quyền thực hiện thao tác này" }), { status: 403 })
        : String(input).includes("/teams/options") ? envelope([]) : envelope(summary),
    );
    wrap(<CourseParticipantsHub course={course} search="" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Bạn không có quyền thực hiện thao tác này");
  });
});
