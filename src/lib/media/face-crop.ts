// Cắt ảnh chân dung khổ dọc 2:3 quanh khuôn mặt để người trong ảnh luôn nằm giữa khung.
// Nhận diện mặt chạy ngay trên trình duyệt (MediaPipe, model + wasm tự host ở /mediapipe), chỉ nạp khi cần.
import type { CropRect } from "@/lib/media/compress-image";

export type FaceBox = { x: number; y: number; width: number; height: number };

// ok: mặt rõ và ở giữa; no-face: không thấy mặt; multi-face: nhiều người; small: mặt quá nhỏ trong khung.
export type CropStatus = "ok" | "no-face" | "multi-face" | "small";

export type FaceCrop = { rect: CropRect; status: CropStatus };

const ASPECT = 2 / 3;
// Tâm mặt nằm ở ~38% chiều cao khung, chiều cao mặt chiếm ~40% khung.
const FACE_CENTER_Y = 0.38;
const FACE_HEIGHT_RATIO = 0.4;
// Khung cắt thấp hơn 360px trong ảnh gốc (mặt dưới ~144px) thì phải phóng to hơn 2 lần ra khổ 480x720: ảnh bị mờ, nên báo xem lại.
const MIN_FRAME_HEIGHT = 360;
// Ảnh dùng để dò mặt thu nhỏ về cạnh dài tối đa này cho nhanh.
const DETECT_MAX_EDGE = 960;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Khung 2:3 lớn nhất vừa trong ảnh.
function largestFrame(width: number, height: number) {
  const frameHeight = Math.min(height, width / ASPECT);
  return { width: frameHeight * ASPECT, height: frameHeight };
}

// Tính vùng cắt 2:3 từ ảnh và các mặt đã dò được (toạ độ theo ảnh gốc). Hàm thuần để dễ kiểm thử.
export function computeFaceCrop(imageWidth: number, imageHeight: number, faces: FaceBox[]): FaceCrop {
  const max = largestFrame(imageWidth, imageHeight);
  if (faces.length === 0) {
    // Không thấy mặt: cắt giữa, dịch lên trên vì mặt thường ở nửa trên ảnh chân dung.
    return {
      rect: { x: (imageWidth - max.width) / 2, y: (imageHeight - max.height) * 0.25, width: max.width, height: max.height },
      status: "no-face",
    };
  }
  const face = faces.reduce((largest, item) => (item.width * item.height > largest.width * largest.height ? item : largest));
  const frameHeight = Math.min(max.height, face.height / FACE_HEIGHT_RATIO);
  const frameWidth = frameHeight * ASPECT;
  const centerX = face.x + face.width / 2;
  const centerY = face.y + face.height / 2;
  const x = clamp(centerX - frameWidth / 2, 0, imageWidth - frameWidth);
  const y = clamp(centerY - frameHeight * FACE_CENTER_Y, 0, imageHeight - frameHeight);
  const status: CropStatus = faces.length > 1 ? "multi-face" : frameHeight < MIN_FRAME_HEIGHT ? "small" : "ok";
  return { rect: { x, y, width: frameWidth, height: frameHeight }, status };
}

type Detector = { detect: (image: HTMLCanvasElement) => { detections: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number } }> } };

let detectorPromise: Promise<Detector | null> | null = null;
let infoLogSilenced = false;

// MediaPipe in dòng thông tin "INFO: Created TensorFlow Lite ..." bằng console.error nên Next hiện thành lỗi giả; chỉ bỏ đúng dòng đó.
function silenceMediaPipeInfoLog() {
  if (infoLogSilenced) return;
  infoLogSilenced = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO: Created TensorFlow Lite")) return;
    original(...args);
  };
}

// Nạp model một lần; lỗi (mất mạng, trình duyệt cũ) thì trả null và rơi về cắt giữa, không chặn import.
function loadDetector(): Promise<Detector | null> {
  detectorPromise ??= (async () => {
    try {
      silenceMediaPipeInfoLog();
      const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      return (await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite", delegate: "CPU" },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
      })) as unknown as Detector;
    } catch {
      detectorPromise = null;
      return null;
    }
  })();
  return detectorPromise;
}

// Dò mặt trên ảnh thu nhỏ rồi quy về toạ độ ảnh gốc. Trả null nếu không dò được (model không nạp được).
export async function detectFaces(source: CanvasImageSource, width: number, height: number): Promise<FaceBox[] | null> {
  const detector = await loadDetector();
  if (!detector) return null;
  const scale = Math.min(1, DETECT_MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    return detector.detect(canvas).detections.flatMap((item) => {
      const box = item.boundingBox;
      return box ? [{ x: box.originX / scale, y: box.originY / scale, width: box.width / scale, height: box.height / scale }] : [];
    });
  } catch {
    return null;
  }
}
