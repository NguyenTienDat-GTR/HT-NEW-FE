import { describe, expect, it } from "vitest";
import { clampOffset, coverScale, FRAME_HEIGHT, FRAME_WIDTH, MAX_ZOOM } from "@/lib/media/avatar-frame";
import { frameFromCrop } from "@/lib/media/face-frame";

const natural = { width: 2000, height: 3000 };

describe("frameFromCrop", () => {
  it("phóng to đủ để vùng cắt phủ kín khung 4x6", () => {
    const rect = { x: 500, y: 600, width: 800, height: 1200 };
    const { zoom, offset } = frameFromCrop(rect, natural);
    const scale = coverScale(natural) * zoom;
    expect(rect.width * scale).toBeCloseTo(FRAME_WIDTH, 3);
    expect(rect.height * scale).toBeCloseTo(FRAME_HEIGHT, 3);
    expect(offset.x).toBeCloseTo(-rect.x * scale, 3);
    expect(offset.y).toBeCloseTo(-rect.y * scale, 3);
  });

  it("không phóng nhỏ hơn mức phủ khung và không vượt giới hạn phóng to", () => {
    expect(frameFromCrop({ x: 0, y: 0, width: 2000, height: 3000 }, natural).zoom).toBe(1);
    expect(frameFromCrop({ x: 100, y: 100, width: 40, height: 60 }, natural).zoom).toBe(MAX_ZOOM);
  });

  it("luôn giữ ảnh phủ kín khung khi vùng cắt sát mép", () => {
    const { zoom, offset } = frameFromCrop({ x: 0, y: 0, width: 600, height: 900 }, natural);
    const scale = coverScale(natural) * zoom;
    expect(offset).toEqual(clampOffset(offset, natural, scale));
  });
});
