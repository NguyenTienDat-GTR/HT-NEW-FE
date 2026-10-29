import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarLightbox } from "@/components/common/avatar-lightbox";
import { AvatarUploadDialog, FRAME_HEIGHT, FRAME_WIDTH } from "@/components/common/avatar-upload-dialog";
import { cropPortraitToFile } from "@/lib/media/compress-image";
import { uploadPreparedMedia } from "@/lib/media/upload-media";

vi.mock("@/lib/media/compress-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/compress-image")>();
  return { ...actual, cropPortraitToFile: vi.fn() };
});
vi.mock("@/lib/media/upload-media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/upload-media")>();
  return { ...actual, uploadPreparedMedia: vi.fn() };
});

const uploaded = {
  assetId: "asset-1",
  category: "LEADER_AVATAR" as const,
  url: "/api/media/asset-1/medium?exp=1&sig=a",
  thumbUrl: "/api/media/asset-1/thumb?exp=1&sig=a",
  width: 480,
  height: 720,
  bytes: 1000,
};

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function pick(file: File) {
  fireEvent.change(screen.getByTestId("avatar-file-input"), { target: { files: [file] } });
}

// jsdom không tải ảnh thật: giả lập ảnh đã nạp với kích thước tự nhiên cho trước.
function loadImage(width: number, height: number) {
  const image = screen.getByAltText("Ảnh đang căn chỉnh") as HTMLImageElement;
  Object.defineProperty(image, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(image, "naturalHeight", { value: height, configurable: true });
  fireEvent.load(image);
  return image;
}

function lastCropRect() {
  return vi.mocked(cropPortraitToFile).mock.calls.at(-1)![1];
}

describe("AvatarUploadDialog", () => {
  it("warns that the photo may be printed on certificates and what it must look like", () => {
    render(<AvatarUploadDialog onOpenChange={vi.fn()} onUploaded={vi.fn()} open />);
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("có thể được in lên chứng nhận");
    expect(note).toHaveTextContent("rõ mặt");
    expect(note).toHaveTextContent("đúng đồng phục");
    expect(note).toHaveTextContent("đeo khăn quàng");
    expect(note).toHaveTextContent("đầu tóc gọn gàng");
  });

  it("shows a 4x6 portrait frame (2:3) to align the photo", () => {
    render(<AvatarUploadDialog onOpenChange={vi.fn()} onUploaded={vi.fn()} open />);
    const frame = screen.getByTestId("avatar-frame");
    expect(frame).toHaveStyle({ width: `${FRAME_WIDTH}px`, height: `${FRAME_HEIGHT}px` });
    expect(FRAME_WIDTH / FRAME_HEIGHT).toBeCloseTo(4 / 6);
    expect(screen.getByRole("button", { name: "Dùng ảnh này" })).toBeDisabled();
  });

  it("crops exactly the area inside the frame, centered by default, and uploads only after confirming", async () => {
    vi.mocked(cropPortraitToFile).mockResolvedValue(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    vi.mocked(uploadPreparedMedia).mockResolvedValue(uploaded);
    const onUploaded = vi.fn();
    const onOpenChange = vi.fn();
    render(<AvatarUploadDialog onOpenChange={onOpenChange} onUploaded={onUploaded} open />);

    pick(new File(["raw"], "anh.png", { type: "image/png" }));
    expect(screen.getByRole("button", { name: "Dùng ảnh này" })).toBeDisabled();
    loadImage(1200, 800);
    expect(screen.getByRole("button", { name: "Dùng ảnh này" })).toBeEnabled();
    expect(uploadPreparedMedia).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Dùng ảnh này" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(uploaded));

    // Ảnh 1200x800 phủ kín khung 240x360: tỉ lệ 0.45, vùng cắt rộng 533, cao 800, lệch giữa 333 từ trái.
    const rect = lastCropRect();
    expect(rect.x).toBeCloseTo(333.33, 1);
    expect(rect.y).toBeCloseTo(0, 5);
    expect(rect.width).toBeCloseTo(533.33, 1);
    expect(rect.height).toBeCloseTo(800, 5);
    expect(rect.width / rect.height).toBeCloseTo(4 / 6, 3);
    expect(uploadPreparedMedia).toHaveBeenCalledWith(expect.any(File), "LEADER_AVATAR");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("zooming keeps the center and shrinks the cropped area", async () => {
    vi.mocked(cropPortraitToFile).mockResolvedValue(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    vi.mocked(uploadPreparedMedia).mockResolvedValue(uploaded);
    render(<AvatarUploadDialog onOpenChange={vi.fn()} onUploaded={vi.fn()} open />);
    pick(new File(["raw"], "anh.png", { type: "image/png" }));
    loadImage(1200, 800);

    fireEvent.change(screen.getByLabelText("Phóng to / thu nhỏ"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Dùng ảnh này" }));
    await waitFor(() => expect(cropPortraitToFile).toHaveBeenCalled());

    const rect = lastCropRect();
    expect(rect.width).toBeCloseTo(266.67, 1);
    expect(rect.height).toBeCloseTo(400, 1);
    // Tâm vùng cắt vẫn là tâm ảnh gốc (600, 400).
    expect(rect.x + rect.width / 2).toBeCloseTo(600, 0);
    expect(rect.y + rect.height / 2).toBeCloseTo(400, 0);
  });

  it("dragging moves the photo inside the frame but never exposes empty space", async () => {
    vi.mocked(cropPortraitToFile).mockResolvedValue(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    vi.mocked(uploadPreparedMedia).mockResolvedValue(uploaded);
    render(<AvatarUploadDialog onOpenChange={vi.fn()} onUploaded={vi.fn()} open />);
    pick(new File(["raw"], "anh.png", { type: "image/png" }));
    loadImage(1200, 800);
    const frame = screen.getByTestId("avatar-frame");

    // Kéo ảnh sang phải 50px: vùng cắt dịch sang trái 50/0.45 điểm ảnh.
    fireEvent.pointerDown(frame, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 150, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(frame, { pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Dùng ảnh này" }));
    await waitFor(() => expect(cropPortraitToFile).toHaveBeenCalledTimes(1));
    expect(lastCropRect().x).toBeCloseTo(333.33 - 50 / 0.45, 1);
  });

  it("cannot be dragged past the edges (no empty space is ever cropped)", async () => {
    vi.mocked(cropPortraitToFile).mockResolvedValue(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    vi.mocked(uploadPreparedMedia).mockResolvedValue(uploaded);
    render(<AvatarUploadDialog onOpenChange={vi.fn()} onUploaded={vi.fn()} open />);
    pick(new File(["raw"], "anh.png", { type: "image/png" }));
    loadImage(1200, 800);
    const frame = screen.getByTestId("avatar-frame");

    fireEvent.pointerDown(frame, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 5000, clientY: 5000, pointerId: 1 });
    fireEvent.pointerUp(frame, { pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Dùng ảnh này" }));
    await waitFor(() => expect(cropPortraitToFile).toHaveBeenCalledTimes(1));
    expect(lastCropRect().x).toBeCloseTo(0, 5);
    expect(lastCropRect().y).toBeCloseTo(0, 5);
  });

  it("rejects a file that is not an image", () => {
    render(<AvatarUploadDialog onOpenChange={vi.fn()} onUploaded={vi.fn()} open />);
    pick(new File(["x"], "a.txt", { type: "text/plain" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ nhận tệp ảnh");
    expect(screen.queryByAltText("Ảnh đang căn chỉnh")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dùng ảnh này" })).toBeDisabled();
  });

  it("keeps the dialog open and shows the server error when upload fails", async () => {
    vi.mocked(cropPortraitToFile).mockResolvedValue(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    vi.mocked(uploadPreparedMedia).mockRejectedValue(new Error("Không lưu được ảnh"));
    const onUploaded = vi.fn();
    render(<AvatarUploadDialog onOpenChange={vi.fn()} onUploaded={onUploaded} open />);
    pick(new File(["raw"], "anh.png", { type: "image/png" }));
    loadImage(800, 1200);
    fireEvent.click(screen.getByRole("button", { name: "Dùng ảnh này" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không lưu được ảnh");
    expect(onUploaded).not.toHaveBeenCalled();
  });
});

describe("AvatarLightbox", () => {
  it("opens the full-size photo when the avatar frame is clicked", () => {
    render(
      <AvatarLightbox name="Nguyễn Văn An" src="/api/media/a/medium?exp=1&sig=x">
        <span>khung</span>
      </AvatarLightbox>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Xem ảnh đại diện của Nguyễn Văn An" }));
    expect(screen.getByAltText("Ảnh đại diện của Nguyễn Văn An")).toHaveAttribute("src", "/backend/api/media/a/medium?exp=1&sig=x");
  });

  it("is not clickable when there is no photo", () => {
    render(
      <AvatarLightbox name="Nguyễn Văn An" src={null}>
        <span>khung</span>
      </AvatarLightbox>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("khung")).toBeInTheDocument();
  });
});
