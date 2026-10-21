import { useCallback, useReducer } from "react";

// Lịch sử hoàn tác / làm lại (Ctrl+Z / Ctrl+Y) cho một giá trị bất kỳ.
export const MAX_HISTORY = 100;
// Các thay đổi liên tiếp cùng một khóa trong khoảng này (kéo thả, gõ chữ) gộp thành một bước hoàn tác.
export const COALESCE_WINDOW_MS = 1000;

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  lastKey: string | null;
  lastAt: number;
};

export type HistoryAction<T> =
  | { type: "set"; updater: (current: T) => T; key?: string; now: number }
  | { type: "undo" }
  | { type: "redo" }
  // Nạp giá trị mới và xóa toàn bộ lịch sử (đổi sang cấu hình khác, tạo mới).
  | { type: "load"; value: T };

export function createHistory<T>(initial: T): History<T> {
  return { past: [], present: initial, future: [], lastKey: null, lastAt: 0 };
}

export function historyReducer<T>(state: History<T>, action: HistoryAction<T>): History<T> {
  switch (action.type) {
    case "set": {
      const next = action.updater(state.present);
      if (Object.is(next, state.present)) return state;
      const coalesce =
        action.key != null && action.key === state.lastKey && action.now - state.lastAt < COALESCE_WINDOW_MS && state.past.length > 0;
      if (coalesce) {
        return { ...state, present: next, future: [], lastAt: action.now };
      }
      const past = [...state.past, state.present];
      if (past.length > MAX_HISTORY) past.shift();
      return { past, present: next, future: [], lastKey: action.key ?? null, lastAt: action.now };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        lastKey: null,
        lastAt: 0,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return { past: [...state.past, state.present], present: next, future: rest, lastKey: null, lastAt: 0 };
    }
    case "load":
      return createHistory(action.value);
  }
}

export function useUndoHistory<T>(initial: T) {
  const [state, dispatch] = useReducer(historyReducer<T>, initial, createHistory<T>);

  const set = useCallback(
    (updater: (current: T) => T, key?: string) => dispatch({ type: "set", updater, key, now: Date.now() }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const load = useCallback((value: T) => dispatch({ type: "load", value }), []);

  return {
    value: state.present,
    set,
    undo,
    redo,
    load,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
