import { describe, expect, it } from "vitest";
import { computeFaceCrop } from "@/lib/media/face-crop";

const ratio = (rect: { width: number; height: number }) => rect.width / rect.height;

describe("computeFaceCrop", () => {
  it("giữ khung 2:3 và nằm trong ảnh", () => {
    const { rect } = computeFaceCrop(1200, 1600, [{ x: 500, y: 400, width: 200, height: 260 }]);
    expect(ratio(rect)).toBeCloseTo(2 / 3, 5);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1200 + 1e-6);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1600 + 1e-6);
  });

  it("đưa mặt lệch trái vào giữa khung theo chiều ngang", () => {
    const face = { x: 150, y: 500, width: 200, height: 240 };
    const { rect, status } = computeFaceCrop(2000, 1500, [face]);
    const faceCenter = face.x + face.width / 2;
    expect(faceCenter - rect.x).toBeCloseTo(rect.width / 2, 3);
    expect(status).toBe("ok");
  });

  it("đưa mặt lệch phải vào giữa khung theo chiều ngang", () => {
    const face = { x: 1600, y: 500, width: 200, height: 240 };
    const { rect } = computeFaceCrop(2000, 1500, [face]);
    expect(face.x + face.width / 2 - rect.x).toBeCloseTo(rect.width / 2, 3);
  });

  it("đặt tâm mặt ở khoảng 38% chiều cao khung", () => {
    const face = { x: 800, y: 700, width: 200, height: 240 };
    const { rect } = computeFaceCrop(2000, 3000, [face]);
    expect((face.y + face.height / 2 - rect.y) / rect.height).toBeCloseTo(0.38, 3);
  });

  it("kẹp khung trong biên khi mặt sát mép ảnh", () => {
    const { rect } = computeFaceCrop(1000, 1500, [{ x: 0, y: 0, width: 120, height: 150 }]);
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
  });

  it("không thấy mặt: cắt giữa, dịch lên trên và đánh dấu cần kiểm tra", () => {
    const { rect, status } = computeFaceCrop(2000, 1500, []);
    expect(status).toBe("no-face");
    expect(ratio(rect)).toBeCloseTo(2 / 3, 5);
    expect(rect.x + rect.width / 2).toBeCloseTo(1000, 3);
    expect(rect.y).toBeCloseTo((1500 - rect.height) * 0.25, 3);
  });

  it("nhiều mặt: lấy mặt lớn nhất và đánh dấu nhiều người", () => {
    const big = { x: 1200, y: 400, width: 300, height: 360 };
    const { rect, status } = computeFaceCrop(2400, 1600, [{ x: 200, y: 450, width: 120, height: 150 }, big]);
    expect(status).toBe("multi-face");
    expect(big.x + big.width / 2 - rect.x).toBeCloseTo(rect.width / 2, 3);
  });

  it("mặt quá nhỏ (ảnh độ phân giải thấp): đánh dấu mặt nhỏ", () => {
    const { status } = computeFaceCrop(800, 1200, [{ x: 350, y: 300, width: 40, height: 50 }]);
    expect(status).toBe("small");
  });
});
