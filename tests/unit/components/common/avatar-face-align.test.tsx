import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarUploadDialog } from "@/components/common/avatar-upload-dialog";
import { suggestFaceFrame } from "@/lib/media/face-frame";

vi.mock("@/lib/media/face-frame", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/face-frame")>();
  return { ...actual, suggestFaceFrame: vi.fn() };
});

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function open() {
  render(<AvatarUploadDialog onOpenChange={vi.fn()} onUploaded={vi.fn()} open />);
  fireEvent.change(screen.getByTestId("avatar-file-input"), { target: { files: [new File(["x"], "anh.jpg", { type: "image/jpeg" })] } });
  const image = screen.getByAltText("Ảnh đang căn chỉnh") as HTMLImageElement;
  Object.defineProperty(image, "naturalWidth", { value: 1000, configurable: true });
  Object.defineProperty(image, "naturalHeight", { value: 1500, configurable: true });
  fireEvent.load(image);
  return image;
}

describe("AvatarUploadDialog: tự căn khuôn mặt", () => {
  it("áp dụng khung quanh khuôn mặt và báo đã căn", async () => {
    vi.mocked(suggestFaceFrame).mockResolvedValue({ status: "ok", frame: { zoom: 2, offset: { x: -100, y: -50 } } });
    const image = open();
    expect(await screen.findByTestId("avatar-face-note")).toHaveTextContent("Đã tự căn khuôn mặt");
    expect(image.style.left).toBe("-100px");
    expect(image.style.top).toBe("-50px");
    expect(screen.getByRole("slider", { name: "Phóng to / thu nhỏ" })).toHaveValue("2");
  });

  it("không thấy mặt: giữ cách căn giữa mặc định và cảnh báo", async () => {
    vi.mocked(suggestFaceFrame).mockResolvedValue({ status: "no-face", frame: null });
    const image = open();
    expect(await screen.findByTestId("avatar-face-note")).toHaveTextContent("Không tìm thấy khuôn mặt");
    expect(image.style.left).toBe("0px");
    expect(screen.getByRole("slider", { name: "Phóng to / thu nhỏ" })).toHaveValue("1");
  });

  it("không nạp được bộ nhận diện: vẫn dùng được, chỉ báo tự căn tay", async () => {
    vi.mocked(suggestFaceFrame).mockResolvedValue({ status: "no-detector", frame: null });
    open();
    expect(await screen.findByTestId("avatar-face-note")).toHaveTextContent("Chưa nhận diện được");
    expect(screen.getByRole("button", { name: "Dùng ảnh này" })).toBeEnabled();
  });

  it("người dùng phóng to trong lúc đang dò thì giữ lựa chọn của họ", async () => {
    let finish: (value: Awaited<ReturnType<typeof suggestFaceFrame>>) => void = () => {};
    vi.mocked(suggestFaceFrame).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    open();
    expect(await screen.findByText("Đang nhận diện khuôn mặt…")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", { name: "Phóng to / thu nhỏ" }), { target: { value: "1.5" } });
    finish({ status: "ok", frame: { zoom: 3, offset: { x: -300, y: -300 } } });
    await waitFor(() => expect(screen.queryByText("Đang nhận diện khuôn mặt…")).toBeNull());
    expect(screen.getByRole("slider", { name: "Phóng to / thu nhỏ" })).toHaveValue("1.5");
    expect(screen.queryByTestId("avatar-face-note")).toBeNull();
  });

  it("nút Căn theo khuôn mặt dò lại theo yêu cầu", async () => {
    vi.mocked(suggestFaceFrame).mockResolvedValue({ status: "multi-face", frame: { zoom: 1.5, offset: { x: -10, y: -10 } } });
    open();
    await screen.findByTestId("avatar-face-note");
    fireEvent.click(screen.getByRole("button", { name: "Căn theo khuôn mặt" }));
    await waitFor(() => expect(vi.mocked(suggestFaceFrame)).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("avatar-face-note")).toHaveTextContent("nhiều người");
  });
});
