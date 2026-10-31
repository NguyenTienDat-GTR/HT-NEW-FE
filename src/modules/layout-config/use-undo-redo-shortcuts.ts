import { useEffect } from "react";

const BASE_NON_TEXT_TYPES = ["checkbox", "radio", "color", "range", "button", "file"];

type Options = {
  /** Chỉ lắng nghe phím khi đang được phép sửa. */
  enabled: boolean;
  undo: () => void;
  redo: () => void;
  /** Kiểu ô nhập được coi là KHÔNG phải ô văn bản (phím tắt vẫn hoạt động khi đang đứng trong ô đó). */
  extraNonTextTypes?: string[];
};

/**
 * Ctrl+Z hoàn tác, Ctrl+Y / Ctrl+Shift+Z làm lại cho các trình thiết kế bố cục.
 * Không chặn hoàn tác gốc của trình duyệt khi đang gõ trong ô nhập văn bản.
 */
export function useUndoRedoShortcuts({ enabled, undo, redo, extraNonTextTypes }: Options) {
  const extraKey = (extraNonTextTypes ?? []).join(",");
  useEffect(() => {
    if (!enabled) return;
    const nonText = [...BASE_NON_TEXT_TYPES, ...(extraKey ? extraKey.split(",") : [])];
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "y" || (key === "z" && event.shiftKey);
      if (!isUndo && !isRedo) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const isTextField =
          target.isContentEditable ||
          target.tagName === "TEXTAREA" ||
          (target.tagName === "INPUT" && !nonText.includes((target as HTMLInputElement).type));
        if (isTextField) return;
      }
      event.preventDefault();
      if (isUndo) undo();
      else redo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, undo, redo, extraKey]);
}
