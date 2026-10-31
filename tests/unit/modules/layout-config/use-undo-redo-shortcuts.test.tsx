import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUndoRedoShortcuts } from "@/modules/layout-config/use-undo-redo-shortcuts";

function press(key: string, init: KeyboardEventInit = {}, target: Element | Window = window) {
  const event = new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useUndoRedoShortcuts", () => {
  it("maps Ctrl+Z to undo and Ctrl+Y / Ctrl+Shift+Z to redo", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoRedoShortcuts({ enabled: true, undo, redo }));

    press("z");
    press("y");
    press("z", { shiftKey: true });

    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled or without the Ctrl/Cmd modifier", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoRedoShortcuts({ enabled: false, undo, redo }));
    press("z");
    renderHook(() => useUndoRedoShortcuts({ enabled: true, undo, redo }));
    press("z", { ctrlKey: false });

    expect(undo).not.toHaveBeenCalled();
  });

  it("leaves native undo to text inputs but not to non-text inputs", () => {
    const undo = vi.fn();
    renderHook(() => useUndoRedoShortcuts({ enabled: true, undo, redo: vi.fn() }));
    const text = document.createElement("input");
    const range = document.createElement("input");
    range.type = "range";
    document.body.append(text, range);

    expect(press("z", {}, text).defaultPrevented).toBe(false);
    expect(press("z", {}, range).defaultPrevented).toBe(true);
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("treats extra input types as non-text when asked (badge designer number fields)", () => {
    const undo = vi.fn();
    renderHook(() => useUndoRedoShortcuts({ enabled: true, undo, redo: vi.fn(), extraNonTextTypes: ["number"] }));
    const number = document.createElement("input");
    number.type = "number";
    document.body.append(number);

    expect(press("z", {}, number).defaultPrevented).toBe(true);
  });
});
