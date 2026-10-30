import { describe, expect, it } from "vitest";
import {
  maxFinalScore,
  scoreComponentsError,
  scoreComponentsPayload,
  type ScoreComponentRow,
} from "@/components/form/resource-form/score-components-field";

const row = (patch: Partial<ScoreComponentRow> = {}): ScoreComponentRow => ({ name: "Tinh than", maxScore: 10, coefficient: 1, includeInFinal: true, ...patch });

describe("thành phần điểm khai báo trong khóa", () => {
  it("điểm tổng kết tối đa là trung bình có hệ số của thành phần được tính", () => {
    expect(maxFinalScore([row({ coefficient: 2 }), row({ name: "Ky nang", maxScore: 5 }), row({ name: "Chuyen can", maxScore: 100, includeInFinal: false })])).toBe(8.33);
    expect(maxFinalScore([row({ includeInFinal: false })])).toBeNull();
  });

  it("báo lỗi khi danh sách không hợp lệ", () => {
    expect(scoreComponentsError([])).toMatch(/ít nhất một thành phần/);
    expect(scoreComponentsError([row({ name: " " })])).toMatch(/phải có tên/);
    expect(scoreComponentsError([row(), row({ name: " tinh THAN " })])).toMatch(/trùng/);
    expect(scoreComponentsError([row({ maxScore: 0 })])).toMatch(/Điểm tối đa/);
    expect(scoreComponentsError([row({ coefficient: "abc" })])).toMatch(/Hệ số/);
    expect(scoreComponentsError([row({ includeInFinal: false })])).toMatch(/tính vào điểm tổng kết/);
    expect(scoreComponentsError([row()])).toBeUndefined();
  });

  it("gửi BE: đổi chuỗi sang số, bỏ cờ giao diện, giữ id thành phần đã có", () => {
    expect(scoreComponentsPayload([row({ id: "c1", maxScore: "10", coefficient: "1.5", hasScores: true, name: " Tinh than " })])).toEqual([
      { id: "c1", name: "Tinh than", description: undefined, maxScore: 10, coefficient: 1.5, includeInFinal: true },
    ]);
  });
});
