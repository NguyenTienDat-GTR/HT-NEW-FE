import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { MoneyControl } from "@/components/form/resource-form/money-field";
import { CourseParticipantsHub } from "@/modules/course-participants/components/course-participants-hub";
import { FeeSummaryStrip } from "@/modules/course-participants/components/fee-summary-strip";
import { ParticipantsTable, type FeeColumn } from "@/modules/course-participants/components/participants-table";
import type { ParticipantRow } from "@/modules/course-participants/types";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn(), message: vi.fn() } }));
vi.mock("jsqr", () => ({ default: vi.fn(() => null) }));

const envelope = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data, message: status < 400 ? null : data }), { status, headers: { "content-type": "application/json" } });
const pageOf = (content: unknown[]) => envelope({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, size: 20, number: 0, first: true, last: true });

const rowAn: ParticipantRow = { id: "p1", holyName: "Giuse", fullName: "Nguyễn An", parishName: "Bà Lụa", deaneryName: "Thủ Dầu Một", teamName: "Đội 1", email: "an@x.vn" };
const rowBinh: ParticipantRow = { id: "p2", holyName: "Maria", fullName: "Trần Bình", parishName: "Búng", deaneryName: "Thủ Dầu Một", email: "binh@x.vn" };
const rowChi: ParticipantRow = { id: "p3", holyName: "Anna", fullName: "Lê Chi", parishName: "Búng", deaneryName: "Thủ Dầu Một", email: "chi@x.vn" };

beforeEach(() => {
  useAuthStore.getState().setAccessToken("token");
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.getState().clear();
});

describe("FeeSummaryStrip", () => {
  it("hiện tổng tiền, đã đóng, còn thiếu và số người chưa đóng theo VND", () => {
    render(<FeeSummaryStrip amount={150000} paidCount={40} participantCount={100} />);
    const strip = screen.getByLabelText("Tổng hợp lệ phí");
    expect(within(strip).getByText("15.000.000 ₫")).toBeInTheDocument();
    expect(within(strip).getByText("6.000.000 ₫")).toBeInTheDocument();
    expect(within(strip).getByText("9.000.000 ₫")).toBeInTheDocument();
    expect(within(strip).getByText("60 người")).toBeInTheDocument();
    expect(within(strip).getByText("Tổng tiền").closest("div")).toHaveAttribute("title", "150.000 ₫ × 100 người trong danh sách tham dự");
  });

  it("đóng đủ thì còn thiếu bằng 0 và khóa chưa có người tham dự không lỗi", () => {
    const { rerender } = render(<FeeSummaryStrip amount={150000} paidCount={2} participantCount={2} />);
    expect(screen.getByText("0 ₫", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("0 người")).toBeInTheDocument();
    rerender(<FeeSummaryStrip amount={150000} paidCount={0} participantCount={0} />);
    expect(screen.getAllByText("0 ₫")).toHaveLength(3);
  });

  it("đang tải thì hiện dấu chấm lửng thay vì số", () => {
    render(<FeeSummaryStrip amount={150000} loading paidCount={0} participantCount={0} />);
    expect(screen.getAllByText("…")).toHaveLength(4);
  });
});

describe("ParticipantsTable: cột Đã đóng tiền", () => {
  const baseProps = { loading: false, selected: new Set<string>(), togglingId: null, attendanceEnabled: true, canManage: true, onToggleRow: () => undefined, onToggleAll: () => undefined, onToggleCheckedIn: () => undefined, onOpenDetail: () => undefined };
  const column = (overrides: Partial<FeeColumn> = {}): FeeColumn => ({ canMark: true, paidOf: (row) => Boolean(row.feePaidAt), busyOf: () => false, onToggle: () => undefined, ...overrides });

  it("không có cột khi khóa không thu lệ phí", () => {
    render(<ParticipantsTable {...baseProps} rows={[rowAn]} />);
    expect(screen.queryByText("Đã đóng tiền")).toBeNull();
    expect(screen.queryByLabelText(/Đã đóng lệ phí/)).toBeNull();
  });

  it("cột nằm ngay sau cột Điểm danh", () => {
    render(<ParticipantsTable {...baseProps} fee={column()} rows={[rowAn]} />);
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers.indexOf("Đã đóng tiền")).toBe(headers.indexOf("Điểm danh") + 1);
  });

  it("khóa không bật điểm danh thì cột nằm cuối", () => {
    render(<ParticipantsTable {...baseProps} attendanceEnabled={false} fee={column()} rows={[rowAn]} />);
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers[headers.length - 1]).toBe("Đã đóng tiền");
    expect(screen.queryByText("Điểm danh")).toBeNull();
  });

  it("ô tích phản ánh trạng thái và báo thay đổi theo từng người", () => {
    const onToggle = vi.fn();
    render(<ParticipantsTable {...baseProps} fee={column({ onToggle })} rows={[{ ...rowAn, feePaidAt: "2026-11-18T01:00:00Z" }, rowBinh]} />);
    expect(screen.getByLabelText("Đã đóng lệ phí: Nguyễn An")).toBeChecked();
    expect(screen.getByLabelText("Đã đóng lệ phí: Trần Bình")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("Đã đóng lệ phí: Trần Bình"));
    expect(onToggle).toHaveBeenCalledWith(rowBinh, true);
    fireEvent.click(screen.getByLabelText("Đã đóng lệ phí: Nguyễn An"));
    expect(onToggle).toHaveBeenLastCalledWith(expect.objectContaining({ id: "p1" }), false);
  });

  it("đang lưu thì ô báo bận", () => {
    render(<ParticipantsTable {...baseProps} fee={column({ busyOf: (row) => row.id === "p2" })} rows={[rowAn, rowBinh]} />);
    expect(screen.getByLabelText("Đã đóng lệ phí: Trần Bình")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Đã đóng lệ phí: Nguyễn An")).not.toHaveAttribute("aria-busy");
  });

  it("không có quyền hoặc khóa đã đóng băng thì chỉ xem trạng thái, không có ô tích", () => {
    render(<ParticipantsTable {...baseProps} fee={column({ canMark: false })} rows={[{ ...rowAn, feePaidAt: "2026-11-18T01:00:00Z" }, rowBinh]} />);
    expect(screen.queryByLabelText(/Đã đóng lệ phí/)).toBeNull();
    expect(screen.getByText("Đã đóng")).toBeInTheDocument();
    expect(screen.getByText("Chưa đóng")).toBeInTheDocument();
  });

  it("dòng trống và đang tải trải đủ các cột", () => {
    const { rerender } = render(<ParticipantsTable {...baseProps} fee={column()} rows={[]} />);
    expect(screen.getByText("Không có hồ sơ nào phù hợp.")).toHaveAttribute("colspan", "8");
    rerender(<ParticipantsTable {...baseProps} fee={column()} loading rows={[]} />);
    expect(screen.getByText("Đang tải danh sách…")).toHaveAttribute("colspan", "8");
  });
});

describe("CourseParticipantsHub: tích đóng lệ phí tự lưu", () => {
  type Server = { paid: Map<string, string>; puts: { id: string; paid: boolean }[]; gets: string[]; failIds: Set<string>; failStatus: number };

  function mockApi(rows: ParticipantRow[]) {
    const server: Server = { paid: new Map(), puts: [], gets: [], failIds: new Set(), failStatus: 403 };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input).replace("/backend/api", "");
      const feeMatch = /\/attendance\/participants\/([^/]+)\/fee$/.exec(url);
      if (feeMatch && init?.method === "PUT") {
        const id = decodeURIComponent(feeMatch[1]);
        const { paid } = JSON.parse(String(init.body)) as { paid: boolean };
        server.puts.push({ id, paid });
        if (server.failIds.has(id)) return envelope("Khóa đã kết thúc nên không thể cập nhật lệ phí", server.failStatus);
        if (paid) server.paid.set(id, server.paid.get(id) ?? "2026-11-18T01:00:00Z");
        else server.paid.delete(id);
        return envelope({ participationId: id, feePaid: paid, feePaidAt: server.paid.get(id) ?? null, feePaidBy: "admin" });
      }
      if (url.includes("/attendance/summary")) {
        return envelope({
          courseCode: "KH-1", attendanceEnabled: true, autoSendInvitation: false, totalParticipants: rows.length, checkedIn: 0, notCheckedIn: rows.length,
          invitationSent: 0, invitationPending: rows.length, invitationFailed: 0, withoutEmail: 0,
          feeEnabled: true, feeAmount: 150000, feeTotal: 150000 * rows.length, feePaidTotal: 150000 * server.paid.size,
          feeRemaining: 150000 * (rows.length - server.paid.size), feePaidCount: server.paid.size, feeUnpaidCount: rows.length - server.paid.size,
        });
      }
      if (url.includes("/attendance/participants")) {
        server.gets.push(url);
        const unpaidOnly = url.includes("feePaid=false");
        const visible = rows.filter((row) => !unpaidOnly || !server.paid.has(row.id));
        return pageOf(visible.map((row) => ({ ...row, feePaidAt: server.paid.get(row.id) ?? null })));
      }
      if (url.includes("/teams/options")) return envelope([]);
      return envelope({});
    });
    return server;
  }

  const courseInfo = (overrides: Record<string, unknown> = {}) => ({
    courseCode: "KH-1", courseName: "Khóa 1", attendanceEnabled: true, autoSendInvitation: false, disabled: false, finished: false,
    canManage: true, canScan: true, feeEnabled: true, feeAmount: 150000, ended: false, ...overrides,
  });

  function renderHub(overrides: Record<string, unknown> = {}) {
    return render(
      <Tooltip.Provider>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <CourseParticipantsHub course={courseInfo(overrides)} search="" />
        </QueryClientProvider>
      </Tooltip.Provider>,
    );
  }

  const strip = () => screen.getByLabelText("Tổng hợp lệ phí");

  it("hiện dải tổng hợp và cột đóng tiền khi khóa thu lệ phí", async () => {
    mockApi([rowAn, rowBinh, rowChi]);
    renderHub();
    expect(await screen.findByLabelText("Đã đóng lệ phí: Nguyễn An")).toBeInTheDocument();
    // Chưa ai đóng: tổng tiền và còn thiếu cùng là 450.000 ₫, đã đóng là 0 ₫.
    expect(await within(strip()).findAllByText("450.000 ₫")).toHaveLength(2);
    expect(within(strip()).getByText("0 ₫")).toBeInTheDocument();
    expect(within(strip()).getByText("3 người")).toBeInTheDocument();
  });

  it("khóa không thu lệ phí thì không có dải, cột hay bộ lọc lệ phí", async () => {
    mockApi([rowAn]);
    renderHub({ feeEnabled: false, feeAmount: null });
    await screen.findByText("Giuse Nguyễn An");
    expect(screen.queryByLabelText("Tổng hợp lệ phí")).toBeNull();
    expect(screen.queryByLabelText(/Đã đóng lệ phí/)).toBeNull();
    expect(screen.queryByLabelText("Lọc theo lệ phí")).toBeNull();
  });

  it("tích là đổi ngay, các con số cập nhật theo, lưu nền và không báo thành công", async () => {
    const server = mockApi([rowAn, rowBinh, rowChi]);
    renderHub();
    const box = await screen.findByLabelText("Đã đóng lệ phí: Nguyễn An");
    await within(strip()).findAllByText("450.000 ₫");

    fireEvent.click(box);
    // Đổi ngay trên giao diện, trước cả khi máy chủ trả lời: đã đóng 150.000, còn thiếu 300.000, còn 2 người chưa đóng.
    expect(box).toBeChecked();
    expect(within(strip()).getByText("150.000 ₫", { selector: "dd" })).toBeInTheDocument();
    expect(within(strip()).getByText("300.000 ₫", { selector: "dd" })).toBeInTheDocument();
    expect(within(strip()).getByText("2 người")).toBeInTheDocument();

    await waitFor(() => expect(server.puts).toEqual([{ id: "p1", paid: true }]));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    // Sau khi hàng đợi rảnh, dữ liệu được làm mới và vẫn đúng một lần ghi nhận.
    await waitFor(() => expect(screen.getByLabelText("Đã đóng lệ phí: Nguyễn An")).toBeChecked(), { timeout: 3000 });
    await waitFor(() => expect(within(strip()).getByText("2 người")).toBeInTheDocument(), { timeout: 3000 });
    expect(server.puts).toHaveLength(1);
  });

  it("bỏ tích cũng tự lưu", async () => {
    const server = mockApi([rowAn, rowBinh]);
    server.paid.set("p1", "2026-11-18T01:00:00Z");
    renderHub();
    const box = await screen.findByLabelText("Đã đóng lệ phí: Nguyễn An");
    await waitFor(() => expect(box).toBeChecked());
    fireEvent.click(box);
    expect(box).not.toBeChecked();
    await waitFor(() => expect(server.puts).toEqual([{ id: "p1", paid: false }]));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("tích liên tiếp nhiều người đều được lưu đúng một lần", async () => {
    const server = mockApi([rowAn, rowBinh, rowChi]);
    renderHub();
    const boxes = [await screen.findByLabelText("Đã đóng lệ phí: Nguyễn An"), screen.getByLabelText("Đã đóng lệ phí: Trần Bình"), screen.getByLabelText("Đã đóng lệ phí: Lê Chi")];
    boxes.forEach((box) => fireEvent.click(box));
    boxes.forEach((box) => expect(box).toBeChecked());
    await waitFor(() => expect(server.puts).toHaveLength(3));
    expect(server.puts.map((put) => put.id).sort()).toEqual(["p1", "p2", "p3"]);
    expect(server.puts.every((put) => put.paid)).toBe(true);
    await waitFor(() => expect(within(strip()).getByText("0 người")).toBeInTheDocument(), { timeout: 3000 });
  });

  it("bấm đúp nhanh vào một ô chỉ tính một lần", async () => {
    const server = mockApi([rowAn, rowBinh]);
    renderHub();
    const box = await screen.findByLabelText("Đã đóng lệ phí: Nguyễn An");
    fireEvent.click(box);
    fireEvent.click(box);
    await waitFor(() => expect(server.puts).toHaveLength(1));
    expect(server.puts[0]).toEqual({ id: "p1", paid: true });
    expect(box).toBeChecked();
  });

  it("lưu lỗi thì trả ô về như cũ và báo lỗi tiếng Việt kèm tên người", async () => {
    const server = mockApi([rowAn, rowBinh]);
    server.failIds.add("p2");
    renderHub();
    const box = await screen.findByLabelText("Đã đóng lệ phí: Trần Bình");
    fireEvent.click(box);
    expect(box).toBeChecked();
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe("Không lưu được lệ phí của Maria Trần Bình: Khóa đã kết thúc nên không thể cập nhật lệ phí");
    await waitFor(() => expect(screen.getByLabelText("Đã đóng lệ phí: Trần Bình")).not.toBeChecked());
    // Lỗi quyền / dữ liệu (4xx) không thử lại.
    expect(server.puts).toHaveLength(1);
    expect(within(strip()).getByText("2 người")).toBeInTheDocument();
  });

  it("một người lỗi không làm hỏng các người khác", async () => {
    const server = mockApi([rowAn, rowBinh, rowChi]);
    server.failIds.add("p2");
    renderHub();
    const [an, binh, chi] = [await screen.findByLabelText("Đã đóng lệ phí: Nguyễn An"), screen.getByLabelText("Đã đóng lệ phí: Trần Bình"), screen.getByLabelText("Đã đóng lệ phí: Lê Chi")];
    [an, binh, chi].forEach((box) => fireEvent.click(box));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Đã đóng lệ phí: Trần Bình")).not.toBeChecked();
    expect(screen.getByLabelText("Đã đóng lệ phí: Nguyễn An")).toBeChecked();
    expect(screen.getByLabelText("Đã đóng lệ phí: Lê Chi")).toBeChecked();
  });

  it("lọc người chưa đóng gửi tham số feePaid=false", async () => {
    const server = mockApi([rowAn, rowBinh]);
    server.paid.set("p1", "2026-11-18T01:00:00Z");
    renderHub();
    await screen.findByLabelText("Đã đóng lệ phí: Nguyễn An");
    fireEvent.change(screen.getByLabelText("Lọc theo lệ phí"), { target: { value: "false" } });
    await waitFor(() => expect(server.gets.some((url) => url.includes("feePaid=false"))).toBe(true));
    await waitFor(() => expect(screen.queryByLabelText("Đã đóng lệ phí: Nguyễn An")).toBeNull());
    expect(screen.getByLabelText("Đã đóng lệ phí: Trần Bình")).toBeInTheDocument();
  });

  it.each([
    ["không có quyền quét điểm danh", { canScan: false }],
    ["khóa đã kết thúc thủ công", { finished: true }],
    ["khóa đã quá ngày kết thúc", { ended: true }],
    ["khóa bị vô hiệu hóa", { disabled: true }],
  ])("%s thì chỉ xem trạng thái, không tích được", async (_name, overrides) => {
    mockApi([rowAn]);
    renderHub(overrides);
    await screen.findByText("Giuse Nguyễn An");
    expect(screen.queryByLabelText(/Đã đóng lệ phí/)).toBeNull();
    // Ô trạng thái chỉ đọc (nhãn "Chưa đóng" của dải tổng hợp là thẻ dt, không tính).
    expect(screen.getByText("Chưa đóng", { selector: "span" })).toBeInTheDocument();
  });
});

describe("MoneyControl", () => {
  function Harness({ initial = "" as number | "", readonly = false }) {
    const [value, setValue] = useState<number | "">(initial);
    return <MoneyControl id="fee" onChange={setValue} readonly={readonly} value={value} />;
  }

  it("định dạng hàng nghìn và đọc số tiền bằng chữ khi gõ", () => {
    render(<Harness />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "150000" } });
    expect(input.value).toBe("150.000");
    expect(screen.getByText("Một trăm năm mươi nghìn đồng")).toBeInTheDocument();
    expect(screen.getByText(/Bằng chữ/)).toBeInTheDocument();
  });

  it("bỏ ký tự không phải chữ số và số 0 đứng đầu", () => {
    render(<Harness />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc0012x5.000 ₫" } });
    expect(input.value).toBe("125.000");
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(screen.queryByText(/Bằng chữ/)).toBeNull();
  });

  it("hiện đúng giá trị có sẵn và khóa ô khi chỉ đọc", () => {
    render(<Harness initial={2005000} readonly />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("2.005.000");
    expect(input).toBeDisabled();
    expect(screen.getByText("Hai triệu không trăm lẻ năm nghìn đồng")).toBeInTheDocument();
  });

  it("dùng bàn phím số trên điện thoại và gắn mô tả bằng chữ cho trình đọc màn hình", () => {
    render(<Harness initial={150000} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("aria-describedby", "fee-words");
    expect(document.getElementById("fee-words")).toHaveTextContent("Một trăm năm mươi nghìn đồng");
  });
});
