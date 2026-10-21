import { describe, expect, it } from "vitest";
import { COALESCE_WINDOW_MS, MAX_HISTORY, createHistory, historyReducer, type History } from "@/modules/certificates/undo-history";

const set = (state: History<number>, value: number, now: number, key?: string) =>
  historyReducer(state, { type: "set", updater: () => value, key, now });

describe("undo-history", () => {
  it("undo rồi redo trả về đúng giá trị", () => {
    let state = createHistory(0);
    state = set(state, 1, 0);
    state = set(state, 2, 10);
    state = historyReducer(state, { type: "undo" });
    expect(state.present).toBe(1);
    state = historyReducer(state, { type: "undo" });
    expect(state.present).toBe(0);
    state = historyReducer(state, { type: "redo" });
    expect(state.present).toBe(1);
    state = historyReducer(state, { type: "redo" });
    expect(state.present).toBe(2);
  });

  it("undo/redo khi không còn bước thì giữ nguyên", () => {
    const state = createHistory(5);
    expect(historyReducer(state, { type: "undo" })).toBe(state);
    expect(historyReducer(state, { type: "redo" })).toBe(state);
  });

  it("thay đổi mới sau khi undo xóa nhánh redo", () => {
    let state = createHistory(0);
    state = set(state, 1, 0);
    state = set(state, 2, 10);
    state = historyReducer(state, { type: "undo" });
    state = set(state, 9, 20);
    expect(state.future).toEqual([]);
    expect(state.present).toBe(9);
    state = historyReducer(state, { type: "undo" });
    expect(state.present).toBe(1);
  });

  it("gộp các thay đổi cùng khóa trong khoảng thời gian ngắn thành một bước", () => {
    let state = createHistory(0);
    state = set(state, 1, 0, "move:0");
    state = set(state, 2, 100, "move:0");
    state = set(state, 3, 200, "move:0");
    expect(state.past).toEqual([0]);
    state = historyReducer(state, { type: "undo" });
    expect(state.present).toBe(0);
  });

  it("không gộp khi khác khóa hoặc quá khoảng thời gian", () => {
    let state = createHistory(0);
    state = set(state, 1, 0, "a");
    state = set(state, 2, 100, "b");
    state = set(state, 3, 100 + COALESCE_WINDOW_MS + 1, "b");
    expect(state.past).toEqual([0, 1, 2]);
  });

  it("bỏ qua khi giá trị không đổi", () => {
    const state = createHistory(1);
    expect(historyReducer(state, { type: "set", updater: (v) => v, now: 0 })).toBe(state);
  });

  it("giới hạn số bước lưu", () => {
    let state = createHistory(0);
    for (let i = 1; i <= MAX_HISTORY + 20; i++) state = set(state, i, i * 5000);
    expect(state.past.length).toBe(MAX_HISTORY);
  });

  it("load xóa toàn bộ lịch sử", () => {
    let state = createHistory(0);
    state = set(state, 1, 0);
    state = historyReducer(state, { type: "load", value: 7 });
    expect(state).toEqual(createHistory(7));
  });
});
