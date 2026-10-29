// Đổi vùng cắt quanh khuôn mặt thành vị trí / độ phóng to trong khung căn ảnh 4x6 của hộp chọn ảnh đại diện.
import { clamp, clampOffset, coverScale, FRAME_WIDTH, MAX_ZOOM, type Natural, type Offset } from "@/lib/media/avatar-frame";
import type { CropRect } from "@/lib/media/compress-image";
import { computeFaceCrop, detectFaces, type CropStatus } from "@/lib/media/face-crop";

export type FaceFrame = { zoom: number; offset: Offset };

// no-detector: không nạp được bộ nhận diện (mất mạng, trình duyệt cũ) nên giữ cách căn mặc định.
export type FaceSuggestion = { status: CropStatus | "no-detector"; frame: FaceFrame | null };

// Vùng cắt (toạ độ ảnh gốc) -> zoom + vị trí để vùng đó vừa khít khung; luôn nằm trong giới hạn kéo / phóng to của khung.
export function frameFromCrop(rect: CropRect, natural: Natural): FaceFrame {
  const base = coverScale(natural);
  const zoom = clamp(FRAME_WIDTH / rect.width / base, 1, MAX_ZOOM);
  const scale = base * zoom;
  return { zoom, offset: clampOffset({ x: -rect.x * scale, y: -rect.y * scale }, natural, scale) };
}

// Dò mặt trên ảnh đã nạp và gợi ý khung căn. Không thấy mặt thì không đổi khung (frame = null) để người dùng tự căn.
export async function suggestFaceFrame(source: CanvasImageSource, natural: Natural): Promise<FaceSuggestion> {
  const faces = await detectFaces(source, natural.width, natural.height);
  if (faces === null) return { status: "no-detector", frame: null };
  const { rect, status } = computeFaceCrop(natural.width, natural.height, faces);
  return { status, frame: status === "no-face" ? null : frameFromCrop(rect, natural) };
}

export const FACE_NOTES: Record<FaceSuggestion["status"], { tone: "ok" | "warn"; text: string }> = {
  ok: { tone: "ok", text: "Đã tự căn khuôn mặt vào giữa khung. Bạn vẫn có thể kéo hoặc phóng to để chỉnh lại." },
  "no-face": { tone: "warn", text: "Không tìm thấy khuôn mặt trong ảnh. Hãy chọn ảnh rõ mặt hoặc tự căn khuôn mặt vào giữa khung." },
  "multi-face": { tone: "warn", text: "Ảnh có nhiều người, đã căn theo khuôn mặt lớn nhất. Nên dùng ảnh chỉ có một người." },
  small: { tone: "warn", text: "Khuôn mặt quá nhỏ nên ảnh sẽ bị mờ. Hãy chọn ảnh chụp gần hơn." },
  "no-detector": { tone: "warn", text: "Chưa nhận diện được khuôn mặt tự động. Hãy tự kéo khuôn mặt vào giữa khung." },
};
