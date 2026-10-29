// Khung căn ảnh khổ 4x6 (dọc, rộng:cao = 2:3): đây chính là phần ảnh sẽ được lưu và in lên chứng nhận / thẻ.
// Dùng chung cho hộp chọn ảnh đại diện và bước chỉnh ảnh khi import hàng loạt.
export const FRAME_WIDTH = 240;
export const FRAME_HEIGHT = 360;
export const MAX_ZOOM = 4;

export type Natural = { width: number; height: number };
export type Offset = { x: number; y: number };

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Vị trí hợp lệ: ảnh luôn phủ kín khung (không để hở mép).
export function clampOffset(offset: Offset, natural: Natural, scale: number): Offset {
  return {
    x: clamp(offset.x, FRAME_WIDTH - natural.width * scale, 0),
    y: clamp(offset.y, FRAME_HEIGHT - natural.height * scale, 0),
  };
}

export const coverScale = (natural: Natural) => Math.max(FRAME_WIDTH / natural.width, FRAME_HEIGHT / natural.height);
