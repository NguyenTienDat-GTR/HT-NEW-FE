import { afterEach, describe, expect, it, vi } from "vitest";

// Thư viện giả: khi tạo bộ nhận diện thì in dòng INFO bằng console.error giống MediaPipe thật.
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  FaceDetector: {
    createFromOptions: vi.fn(async () => {
      console.error("INFO: Created TensorFlow Lite XNNPACK delegate for CPU.");
      return { detect: () => ({ detections: [{ boundingBox: { originX: 10, originY: 20, width: 30, height: 40 } }] }) };
    }),
  },
}));

describe("detectFaces: log thông tin của MediaPipe", () => {
  const original = console.error;
  afterEach(() => {
    console.error = original;
    vi.resetModules();
  });

  it("bỏ dòng INFO của TensorFlow Lite nhưng vẫn in các lỗi khác", async () => {
    const spy = vi.fn();
    console.error = spy;
    const { detectFaces } = await import("@/lib/media/face-crop");
    const faces = await detectFaces(document.createElement("canvas"), 100, 100);
    console.error("INFO: Created TensorFlow Lite XNNPACK delegate for CPU.");
    console.error("Lỗi thật cần giữ lại");
    expect(faces).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("Lỗi thật cần giữ lại");
  });
});
