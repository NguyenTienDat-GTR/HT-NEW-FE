"use client";

import { ArrowsInSimple, ArrowsOutSimple, DownloadSimple, Eye, Keyboard, PencilSimple } from "@phosphor-icons/react";
import type { Cell, Workbook, Worksheet } from "exceljs";
import { Fragment, forwardRef, type ReactNode, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateField } from "../api";
import { Toolbar } from "./ribbon";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/client";
import { downloadTemplatePreview } from "../api";
import { buildPreviewPayload, PREVIEW_ROWS, sampleText } from "../sample-data";
import { applyPageSetup, cellAddress, changeCase, colLetter, defaultPageSetup, parseMerge, printableSize, splitTokens, type CaseMode, type MergeRange, type TokenMod } from "../sheet-model";

export type SpreadsheetHandle = { getBuffer: () => Promise<ArrayBuffer> };

type Sel = { ar: number; ac: number; r1: number; c1: number; r2: number; c2: number };
type Anchor4 = [number, number, number, number]; // nativeCol, nativeColOff, nativeRow, nativeRowOff
type ImageAnchors = { tl: Anchor4; br?: Anchor4 };
type AnchorLike = { nativeCol: number; nativeColOff: number; nativeRow: number; nativeRowOff: number; col: number; row: number };
type MediaLike = { range: { tl: AnchorLike; br?: AnchorLike; ext?: { width: number; height: number } } };
type Snapshot = {
  cells: Map<string, { value: Cell["value"]; style: unknown }>;
  merges: string[];
  cols: Map<number, number | undefined>;
  rows: Map<number, number | undefined>;
  media: { item: unknown; anchors: ImageAnchors }[];
};

const anchorOf = (a: AnchorLike): Anchor4 => [a.nativeCol, a.nativeColOff, a.nativeRow, a.nativeRowOff];
const applyAnchor = (target: AnchorLike, a: Anchor4) => {
  target.nativeCol = a[0];
  target.nativeColOff = a[1];
  target.nativeRow = a[2];
  target.nativeRowOff = a[3];
};

const EMU_PER_PX = 9525;

/**
 * Vị trí neo ảnh dạng chỉ số ô thập phân (2.5 = giữa ô thứ 3). Phần lệch trong ô trong file Excel tính bằng EMU thật (px x 9525);
 * getter/setter `col`/`row` của exceljs quy đổi sai tỉ lệ (độ rộng ký tự x 10000) nên ảnh bị lệch khi mở bằng Excel, vì vậy tự quy đổi ở đây.
 */
function anchorIndex(sheet: Worksheet, anchor: AnchorLike, axis: "col" | "row"): number {
  if (axis === "col") return anchor.nativeCol + anchor.nativeColOff / (colPx(sheet.getColumn(anchor.nativeCol + 1).width) * EMU_PER_PX);
  return anchor.nativeRow + anchor.nativeRowOff / (rowPx(sheet.findRow(anchor.nativeRow + 1)?.height) * EMU_PER_PX);
}

function setAnchorIndex(sheet: Worksheet, anchor: AnchorLike, axis: "col" | "row", value: number) {
  const whole = Math.max(0, Math.floor(value));
  const fraction = Math.max(0, value - whole);
  if (axis === "col") {
    anchor.nativeCol = whole;
    anchor.nativeColOff = Math.round(fraction * colPx(sheet.getColumn(whole + 1).width) * EMU_PER_PX);
  } else {
    anchor.nativeRow = whole;
    anchor.nativeRowOff = Math.round(fraction * rowPx(sheet.findRow(whole + 1)?.height) * EMU_PER_PX);
  }
}

function setSheetMedia(sheet: Worksheet, media: unknown[]) {
  (sheet as unknown as { _media: unknown[] })._media = media;
}

/** Vị trí (px) của chỉ số ô thập phân (vd. 2.5 = giữa ô thứ 3) theo mảng độ lệch. */
function posAt(offsets: number[], position: number) {
  const whole = Math.floor(position);
  return (offsets[whole] ?? offsets[offsets.length - 1]) + ((offsets[whole + 1] ?? offsets[whole]) - (offsets[whole] ?? 0)) * (position - whole);
}

/** Ngược lại: từ vị trí px ra chỉ số ô thập phân. */
function indexAt(offsets: number[], px: number) {
  if (px <= 0) return 0;
  for (let j = 0; j < offsets.length - 1; j++) {
    if (px < offsets[j + 1]) return j + (px - offsets[j]) / Math.max(1, offsets[j + 1] - offsets[j]);
  }
  return offsets.length - 1;
}

const DEFAULT_FONT = { name: "Times New Roman", size: 12 };
function shiftSnapshot(state: Snapshot, axis: "row" | "col", at: number, count: number, mode: "insert" | "delete"): Snapshot {
  const end = at + count - 1;
  const mapIndex = (i: number) => (mode === "insert" ? (i >= at ? i + count : i) : i < at ? i : i > end ? i - count : null);
  const cells = new Map<string, { value: Cell["value"]; style: unknown }>();
  state.cells.forEach((value, key) => {
    const [r, c] = key.split(":").map(Number);
    const moved = mapIndex(axis === "row" ? r : c);
    if (moved === null) return;
    cells.set(axis === "row" ? `${moved}:${c}` : `${r}:${moved}`, value);
  });
  const merges: string[] = [];
  for (const text of state.merges) {
    const range = parseMerge(text);
    if (!range) continue;
    const [a1, a2] = axis === "row" ? [range.r1, range.r2] : [range.c1, range.c2];
    let n1: number;
    let n2: number;
    if (mode === "insert") {
      n1 = a1 >= at ? a1 + count : a1;
      n2 = a2 >= at ? a2 + count : a2;
    } else {
      n1 = a1 < at ? a1 : a1 <= end ? at : a1 - count;
      n2 = a2 < at ? a2 : a2 <= end ? at - 1 : a2 - count;
    }
    if (n2 < n1) continue;
    const next = axis === "row" ? { ...range, r1: n1, r2: n2 } : { ...range, c1: n1, c2: n2 };
    if (next.r1 === next.r2 && next.c1 === next.c2) continue;
    merges.push(`${cellAddress(next.r1, next.c1)}:${cellAddress(next.r2, next.c2)}`);
  }
  const resize = (sizes: Map<number, number | undefined>, limit: number) => {
    const out = new Map<number, number | undefined>();
    for (let j = 1; j <= limit; j++) {
      const source = mode === "insert" ? (j < at ? j : j <= end ? null : j - count) : j < at ? j : j + count;
      out.set(j, source === null ? undefined : sizes.get(source));
    }
    return out;
  };
  const shiftAnchor = (a: Anchor4): Anchor4 => {
    const idx = axis === "row" ? a[2] : a[0];
    const at0 = at - 1;
    let moved = idx;
    let reset = false;
    if (mode === "insert") {
      if (idx >= at0) moved = idx + count;
    } else if (idx >= at0 + count) {
      moved = idx - count;
    } else if (idx >= at0) {
      moved = at0;
      reset = true;
    }
    return axis === "row" ? [a[0], a[1], moved, reset ? 0 : a[3]] : [moved, reset ? 0 : a[1], a[2], a[3]];
  };
  return {
    cells,
    merges,
    cols: axis === "col" ? resize(state.cols, MAX_COLS) : state.cols,
    rows: axis === "row" ? resize(state.rows, MAX_ROWS) : state.rows,
    media: state.media.map((m) => ({ item: m.item, anchors: { tl: shiftAnchor(m.anchors.tl), br: m.anchors.br ? shiftAnchor(m.anchors.br) : undefined } })),
  };
}

const MAX_ROWS = 150;
const MAX_COLS = 26;

const colPx = (width?: number) => Math.round((width ?? 8.43) * 7 + 5);
const rowPx = (height?: number) => Math.round((height ?? 16) * (4 / 3));
const argb = (color?: { argb?: string }) => (color?.argb && color.argb.length >= 6 ? `#${color.argb.slice(-6)}` : undefined);
const toArgb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;

function borderCss(side?: { style?: string; color?: { argb?: string } }) {
  if (!side?.style) return undefined;
  const width = side.style === "medium" || side.style === "thick" ? 2 : 1;
  return `${width}px solid ${argb(side.color) ?? "#000"}`;
}

function textOf(cell: Cell) {
  const value = cell.value as unknown;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "richText" in value) return (value as { richText: { text: string }[] }).richText.map((part) => part.text).join("");
  if (value instanceof Date) return value.toLocaleDateString("vi-VN");
  if (typeof value === "object") return cell.text ?? "";
  return String(value);
}

/**
 * Trình soạn bảng tính kiểu Excel cho mẫu danh sách đăng ký (dựa trên exceljs, chạy hoàn toàn trên trình duyệt):
 * chỉnh độ rộng cột / chiều cao dòng bằng cách kéo, gõ chữ trực tiếp vào ô, định dạng chữ (font, cỡ, màu, đậm / nghiêng / gạch chân, canh lề),
 * màu nền, viền, gộp ô, chèn ảnh, hoàn tác; kéo trường từ bảng bên phải thả vào ô để chèn {{trường}}.
 */
export const SpreadsheetEditor = forwardRef<SpreadsheetHandle, { workbook: Workbook; fields: TemplateField[]; readOnly?: boolean; onDirty?: () => void; onSave?: () => void; actions?: ReactNode; fullscreen: boolean; onToggleFullscreen: () => void }>(function SpreadsheetEditor(
  { workbook, fields, readOnly = false, onDirty, onSave, actions, fullscreen, onToggleFullscreen },
  ref,
) {
  const sheet: Worksheet = workbook.worksheets[0] ?? workbook.addWorksheet("Mẫu");
  const [tick, setTick] = useState(0);
  const [sel, setSel] = useState<Sel>({ ar: 1, ac: 1, r1: 1, c1: 1, r2: 1, c2: 1 });
  const [editing, setEditing] = useState<{ row: number; col: number; text: string; bar?: boolean; mode?: "enter" | "edit" } | null>(null);
  const [preview, setPreview] = useState(false);
  const [zoom, setZoom] = useState(100);
  const zoomRef = useRef(1);
  const [menu, setMenu] = useState<{ x: number; y: number; kind: "cell" | "col" | "row" } | null>(null);
  const [sizeDialog, setSizeDialog] = useState<{ kind: "col" | "row"; value: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showBreaks, setShowBreaks] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [painter, setPainter] = useState<unknown>(null);
  const painterRef = useRef<unknown>(null);
  const fillDrag = useRef(false);
  const [fillTarget, setFillTarget] = useState<{ r: number; c: number } | null>(null);
  const fillTargetRef = useRef<{ r: number; c: number } | null>(null);
  // Vị trí con trỏ chữ lần cuối trong ô đang sửa: giữ lại khi ô nhập mất focus (vd. bấm vào ô tìm trường) để chèn trường đúng chỗ.
  const caret = useRef<{ row: number; col: number; start: number; end: number } | null>(null);
  const moveDrag = useRef<{ grabR: number; grabC: number } | null>(null);
  const moveDeltaRef = useRef<{ dr: number; dc: number } | null>(null);
  const [moveDelta, setMoveDelta] = useState<{ dr: number; dc: number } | null>(null);
  const imageResize = useRef<{ index: number; dx: -1 | 0 | 1; dy: -1 | 0 | 1; startX: number; startY: number; left: number; top: number; width: number; height: number } | null>(null);
  const imageDrag = useRef<{ index: number; startX: number; startY: number; col: number; row: number; brCol?: number; brRow?: number } | null>(null);
  const latest = useRef<{ applyFill: () => void; applyPainter: () => void; applyMove: (copy: boolean) => void; colOffsets: number[]; rowOffsets: number[] }>({ applyFill: () => {}, applyPainter: () => {}, applyMove: () => {}, colOffsets: [], rowOffsets: [] });
  const [gridHeight, setGridHeight] = useState(560);
  const frame = useRef<{ start: number; height: number } | null>(null);
  const clip = useRef<{ text: string; cells: ({ value: Cell["value"]; style: unknown } | null)[][] } | null>(null);
  const [canHistory, setCanHistory] = useState({ undo: false, redo: false });
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const history = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const resizing = useRef<{ kind: "col" | "row"; index: number; start: number; size: number } | null>(null);
  const dragging = useRef(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const [resizeCount, forceResize] = useState(0);

  useImperativeHandle(ref, () => ({ getBuffer: async () => {
      defaultPageSetup(workbook.worksheets[0]);
      return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    },
  }), [workbook]);

  const rows = Math.min(MAX_ROWS, Math.max(sheet.rowCount + 15, 40));
  const cols = Math.min(MAX_COLS, Math.max(sheet.columnCount + 2, 10));

  const merges = useMemo(() => {
    void tick;
    const list = ((sheet.model as unknown as { merges?: string[] }).merges ?? []).map(parseMerge).filter((item): item is MergeRange => Boolean(item));
    const master = new Map<string, MergeRange>();
    const covered = new Set<string>();
    for (const range of list) {
      master.set(`${range.r1}:${range.c1}`, range);
      for (let r = range.r1; r <= range.r2; r++) for (let c = range.c1; c <= range.c2; c++) if (r !== range.r1 || c !== range.c1) covered.add(`${r}:${c}`);
    }
    return { master, covered };
  }, [sheet, tick]);

  // ---- lịch sử (hoàn tác / làm lại) ----
  const snapshot = useCallback((): Snapshot => {
    const cells = new Map<string, { value: Cell["value"]; style: unknown }>();
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cells.set(`${rowNumber}:${colNumber}`, { value: cell.value, style: JSON.parse(JSON.stringify(cell.style ?? {})) });
      });
    });
    const colSizes = new Map<number, number | undefined>();
    for (let c = 1; c <= MAX_COLS; c++) colSizes.set(c, sheet.getColumn(c).width);
    const rowSizes = new Map<number, number | undefined>();
    for (let r = 1; r <= MAX_ROWS; r++) rowSizes.set(r, sheet.findRow(r)?.height);
    const media = ((sheet as unknown as { _media: MediaLike[] })._media ?? []).map((item) => ({
      item,
      anchors: { tl: anchorOf(item.range.tl), br: item.range.br ? anchorOf(item.range.br) : undefined },
    }));
    return { cells, merges: [...(((sheet.model as unknown as { merges?: string[] }).merges) ?? [])], cols: colSizes, rows: rowSizes, media };
  }, [sheet]);

  const restore = useCallback(
    (state: Snapshot) => {
      for (const range of [...(((sheet.model as unknown as { merges?: string[] }).merges) ?? [])]) sheet.unMergeCells(range);
      sheet.eachRow({ includeEmpty: true }, (row) => row.eachCell({ includeEmpty: true }, (cell) => {
        cell.value = null;
        cell.style = {};
      }));
      state.cells.forEach((saved, key) => {
        const [r, c] = key.split(":").map(Number);
        const cell = sheet.getCell(r, c);
        cell.value = saved.value;
        cell.style = saved.style as Cell["style"];
      });
      for (const range of state.merges) sheet.mergeCells(range);
      setSheetMedia(sheet, state.media.map((m) => m.item));
      for (const m of state.media) {
        const range = (m.item as MediaLike).range;
        applyAnchor(range.tl, m.anchors.tl);
        if (range.br && m.anchors.br) applyAnchor(range.br, m.anchors.br);
      }
      state.cols.forEach((width, c) => {
        sheet.getColumn(c).width = width;
      });
      state.rows.forEach((height, r) => {
        if (height !== undefined || sheet.findRow(r)) sheet.getRow(r).height = height as number;
      });
    },
    [sheet],
  );

  // Ô nhập luôn nằm sẵn ở ô đang chọn (như Excel) để nhận mọi phím gõ, kể cả bộ gõ tiếng Việt; trả focus về đây sau mỗi thao tác.
  const focusEditor = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active?.dataset?.formulaBar !== undefined) return;
    editor.current?.focus({ preventScroll: true });
  }, []);

  const syncHistory = useCallback(() => setCanHistory({ undo: history.current.length > 0, redo: future.current.length > 0 }), []);

  const mutate = useCallback(
    (change: () => void) => {
      if (readOnly) return;
      history.current.push(snapshot());
      if (history.current.length > 40) history.current.shift();
      future.current = [];
      change();
      setTick((value) => value + 1);
      syncHistory();
      onDirty?.();
      requestAnimationFrame(focusEditor);
    },
    [focusEditor, onDirty, readOnly, snapshot, syncHistory],
  );

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) return;
    future.current.push(snapshot());
    restore(previous);
    setTick((value) => value + 1);
    syncHistory();
    onDirty?.();
  }, [onDirty, restore, snapshot, syncHistory]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(snapshot());
    restore(next);
    setTick((value) => value + 1);
    syncHistory();
    onDirty?.();
  }, [onDirty, restore, snapshot, syncHistory]);

  // ---- chọn ô ----
  function select(row: number, col: number, extend = false) {
    caret.current = null;
    setImageIndex(null);
    setSel((current) => {
      const ar = extend ? current.ar : row;
      const ac = extend ? current.ac : col;
      return { ar, ac, r1: Math.min(ar, row), c1: Math.min(ac, col), r2: Math.max(ar, row), c2: Math.max(ac, col) };
    });
  }

  const masterOf = (row: number, col: number) => {
    if (!merges.covered.has(`${row}:${col}`)) return { row, col };
    for (const range of merges.master.values()) if (row >= range.r1 && row <= range.r2 && col >= range.c1 && col <= range.c2) return { row: range.r1, col: range.c1 };
    return { row, col };
  };

  function forEachSelected(fn: (cell: Cell, row: number, col: number) => void) {
    for (let r = sel.r1; r <= sel.r2; r++) for (let c = sel.c1; c <= sel.c2; c++) fn(sheet.getCell(r, c), r, c);
  }

  const active = sheet.getCell(sel.ar, sel.ac);
  const font = { ...DEFAULT_FONT, ...(active.font ?? {}) } as NonNullable<Cell["font"]>;

  // ---- định dạng ----
  function setFont(patch: Partial<NonNullable<Cell["font"]>>) {
    mutate(() => forEachSelected((cell) => (cell.font = { ...DEFAULT_FONT, ...(cell.font ?? {}), ...patch })));
  }
  function toggleFont(key: "bold" | "italic" | "underline") {
    const next = !font[key];
    setFont({ [key]: next } as Partial<NonNullable<Cell["font"]>>);
  }
  function setAlign(patch: Partial<NonNullable<Cell["alignment"]>>) {
    mutate(() => forEachSelected((cell) => (cell.alignment = { ...(cell.alignment ?? {}), ...patch })));
  }
  function setFill(hex: string | null) {
    mutate(() =>
      forEachSelected((cell) => {
        cell.fill = hex ? { type: "pattern", pattern: "solid", fgColor: { argb: toArgb(hex) } } : { type: "pattern", pattern: "none" };
      }),
    );
  }
  function setBorders(mode: "all" | "outer" | "none" | "bottom") {
    const thin = { style: "thin" as const, color: { argb: "FF000000" } };
    mutate(() =>
      forEachSelected((cell, r, c) => {
        if (mode === "none") {
          cell.border = {};
        } else if (mode === "all") {
          cell.border = { top: thin, left: thin, bottom: thin, right: thin };
        } else if (mode === "bottom") {
          if (r === sel.r2) cell.border = { ...(cell.border ?? {}), bottom: thin };
        } else {
          cell.border = {
            ...(cell.border ?? {}),
            ...(r === sel.r1 ? { top: thin } : {}),
            ...(r === sel.r2 ? { bottom: thin } : {}),
            ...(c === sel.c1 ? { left: thin } : {}),
            ...(c === sel.c2 ? { right: thin } : {}),
          };
        }
      }),
    );
  }
  const isMerged = merges.master.has(`${sel.r1}:${sel.c1}`) && (sel.r1 !== sel.r2 || sel.c1 !== sel.c2 || true);
  function toggleMerge() {
    const key = `${sel.r1}:${sel.c1}`;
    const existing = merges.master.get(key);
    if (existing && sel.r1 === sel.r2 && sel.c1 === sel.c2) {
      mutate(() => sheet.unMergeCells(cellAddress(existing.r1, existing.c1)));
      return;
    }
    if (sel.r1 === sel.r2 && sel.c1 === sel.c2) return;
    mutate(() => {
      for (const range of merges.master.values()) {
        if (range.r1 <= sel.r2 && range.r2 >= sel.r1 && range.c1 <= sel.c2 && range.c2 >= sel.c1) sheet.unMergeCells(cellAddress(range.r1, range.c1));
      }
      sheet.mergeCells(`${cellAddress(sel.r1, sel.c1)}:${cellAddress(sel.r2, sel.c2)}`);
    });
  }

  // ---- chèn / xóa dòng, cột (như Excel) ----
  function shiftSheet(axis: "row" | "col", mode: "insert" | "delete") {
    const at = axis === "row" ? sel.r1 : sel.c1;
    const count = axis === "row" ? sel.r2 - sel.r1 + 1 : sel.c2 - sel.c1 + 1;
    mutate(() => restore(shiftSnapshot(snapshot(), axis, at, count, mode)));
    if (mode === "delete") select(axis === "row" ? Math.min(sel.r1, rows) : sel.r1, axis === "col" ? Math.min(sel.c1, cols) : sel.c1);
  }

  function applyCase(mode: CaseMode) {
    // Đang sửa ô và có chữ bôi đen (trong ô hoặc thanh công thức): chỉ đổi phần bôi đen, như Excel.
    const input: HTMLTextAreaElement | HTMLInputElement | null =
      editing && !editing.bar ? editor.current : editing?.bar ? (document.querySelector("[data-formula-bar]") as HTMLInputElement | null) : null;
    if (editing && input && input.selectionStart !== null && input.selectionEnd !== null && input.selectionStart !== input.selectionEnd) {
      const text = editing.text;
      let start = input.selectionStart;
      let end = input.selectionEnd;
      // Bôi đen chạm vào một phần của {{trường}} thì lấy trọn trường đó.
      for (const match of text.matchAll(/\{\{[^}]*\}\}/g)) {
        const from = match.index ?? 0;
        const to = from + match[0].length;
        if (from < end && to > start) {
          start = Math.min(start, from);
          end = Math.max(end, to);
        }
      }
      const replaced = changeCase(text.slice(start, end), mode);
      setEditing({ ...editing, text: text.slice(0, start) + replaced + text.slice(end) });
      caret.current = { row: editing.row, col: editing.col, start, end: start + replaced.length };
      requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
        input.setSelectionRange(start, start + replaced.length);
      });
      return;
    }
    mutate(() =>
      forEachSelected((cell) => {
        const text = textOf(cell);
        if (text) cell.value = changeCase(text, mode);
      }),
    );
  }

  // ---- sao chép / cắt / dán (kể cả với Excel bên ngoài) ----
  function copyCore(cut: boolean): string {
    const matrix: ({ value: Cell["value"]; style: unknown } | null)[][] = [];
    const lines: string[] = [];
    for (let r = sel.r1; r <= sel.r2; r++) {
      const line: ({ value: Cell["value"]; style: unknown } | null)[] = [];
      const texts: string[] = [];
      for (let c = sel.c1; c <= sel.c2; c++) {
        const cell = sheet.getCell(r, c);
        line.push({ value: cell.value, style: JSON.parse(JSON.stringify(cell.style ?? {})) });
        texts.push(textOf(cell).replace(/\t/g, " "));
      }
      matrix.push(line);
      lines.push(texts.join("\t"));
    }
    const text = lines.join("\n");
    clip.current = { text, cells: matrix };
    if (cut && !readOnly) {
      mutate(() =>
        forEachSelected((cell) => {
          cell.value = null;
          cell.style = {};
        }),
      );
    }
    return text;
  }

  function pasteCore(text: string, mode: "all" | "values" | "formats" = "all") {
    const internal = clip.current && clip.current.text === text ? clip.current : null;
    const grid: ({ value: Cell["value"]; style?: unknown } | null)[][] = internal
      ? internal.cells
      : text
          .replace(/\r\n/g, "\n")
          .replace(/\n$/, "")
          .split("\n")
          .map((line) => line.split("\t").map((value) => ({ value: value === "" ? null : value })));
    if (!grid.length || readOnly) return;
    mutate(() => {
      grid.forEach((line, i) =>
        line.forEach((item, j) => {
          const r = sel.r1 + i;
          const c = sel.c1 + j;
          if (!item || r > MAX_ROWS || c > MAX_COLS) return;
          const cell = sheet.getCell(r, c);
          if (mode !== "formats") cell.value = item.value;
          if (item.style && mode !== "values") cell.style = JSON.parse(JSON.stringify(item.style)) as Cell["style"];
        }),
      );
    });
    const h = grid.length;
    const w = Math.max(...grid.map((line) => line.length));
    setSel({ ar: sel.r1, ac: sel.c1, r1: sel.r1, c1: sel.c1, r2: Math.min(MAX_ROWS, sel.r1 + h - 1), c2: Math.min(MAX_COLS, sel.c1 + w - 1) });
  }

  function onCopy(event: React.ClipboardEvent, cut = false) {
    if (editing || preview) return;
    event.preventDefault();
    event.clipboardData.setData("text/plain", copyCore(cut));
  }

  function onPaste(event: React.ClipboardEvent) {
    if (editing || preview || readOnly) return;
    event.preventDefault();
    pasteCore(event.clipboardData.getData("text/plain"));
  }

  async function menuCopy(cut: boolean) {
    const text = copyCore(cut);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // không ghi được vào bộ nhớ tạm của hệ thống: vẫn dán được trong trình soạn
    }
  }

  async function menuPaste(mode: "all" | "values" | "formats" = "all") {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = clip.current?.text ?? "";
    }
    if (text) pasteCore(text, mode);
  }

  function clearFormats() {
    mutate(() => forEachSelected((cell) => (cell.style = {})));
  }

  function clearAll() {
    mutate(() =>
      forEachSelected((cell) => {
        cell.value = null;
        cell.style = {};
      }),
    );
  }

  // ---- sao chép định dạng (cọ) ----
  function startPainter() {
    const style = JSON.parse(JSON.stringify(active.style ?? {}));
    painterRef.current = style;
    setPainter(style);
  }
  function applyPainter() {
    const style = painterRef.current;
    if (!style) return;
    painterRef.current = null;
    setPainter(null);
    mutate(() => forEachSelected((cell) => (cell.style = JSON.parse(JSON.stringify(style)) as Cell["style"])));
  }

  // ---- chốt điền (kéo góc dưới phải của vùng chọn) ----
  function applyFill() {
    const target = fillTargetRef.current;
    fillTargetRef.current = null;
    setFillTarget(null);
    if (!target) return;
    const h = sel.r2 - sel.r1 + 1;
    const w = sel.c2 - sel.c1 + 1;
    const downBy = target.r - sel.r2;
    const rightBy = target.c - sel.c2;
    if (downBy <= 0 && rightBy <= 0) return;
    const copyCell = (from: Cell, to: Cell) => {
      to.value = from.value;
      to.style = JSON.parse(JSON.stringify(from.style ?? {})) as Cell["style"];
    };
    if (downBy >= rightBy) {
      mutate(() => {
        for (let r = sel.r2 + 1; r <= target.r; r++) for (let c = sel.c1; c <= sel.c2; c++) copyCell(sheet.getCell(sel.r1 + ((r - sel.r2 - 1) % h), c), sheet.getCell(r, c));
      });
      setSel({ ...sel, r2: target.r });
    } else {
      mutate(() => {
        for (let c = sel.c2 + 1; c <= target.c; c++) for (let r = sel.r1; r <= sel.r2; r++) copyCell(sheet.getCell(r, sel.c1 + ((c - sel.c2 - 1) % w)), sheet.getCell(r, c));
      });
      setSel({ ...sel, c2: target.c });
    }
  }

  // ---- kích thước dòng / cột theo hộp thoại (đơn vị như Excel: độ rộng = số ký tự, chiều cao = point) ----
  function openSizeDialog(kind: "col" | "row") {
    const current = kind === "col" ? sheet.getColumn(sel.c1).width ?? 8.43 : sheet.findRow(sel.r1)?.height ?? 15;
    setSizeDialog({ kind, value: String(Math.round(current * 100) / 100) });
  }
  function applySize() {
    if (!sizeDialog) return;
    const value = Number(sizeDialog.value.replace(",", "."));
    const { kind } = sizeDialog;
    setSizeDialog(null);
    if (!Number.isFinite(value) || value <= 0) return;
    mutate(() => {
      if (kind === "col") for (let c = sel.c1; c <= sel.c2; c++) sheet.getColumn(c).width = Math.min(255, value);
      else for (let r = sel.r1; r <= sel.r2; r++) sheet.getRow(r).height = Math.min(409, value);
    });
  }

  function clearContents() {
    mutate(() => forEachSelected((cell) => (cell.value = null)));
  }

  // Ctrl+D / Ctrl+R: điền xuống / sang phải từ dòng / cột đầu của vùng chọn.
  function fill(direction: "down" | "right") {
    const copyCell = (from: Cell, to: Cell) => {
      to.value = from.value;
      to.style = JSON.parse(JSON.stringify(from.style ?? {})) as Cell["style"];
    };
    mutate(() => {
      if (direction === "down") {
        for (let c = sel.c1; c <= sel.c2; c++) for (let r = sel.r1 + 1; r <= sel.r2; r++) copyCell(sheet.getCell(sel.r1, c), sheet.getCell(r, c));
      } else {
        for (let r = sel.r1; r <= sel.r2; r++) for (let c = sel.c1 + 1; c <= sel.c2; c++) copyCell(sheet.getCell(r, sel.c1), sheet.getCell(r, c));
      }
    });
  }

  // Bấm đúp mép cột: tự khớp độ rộng theo nội dung dài nhất (trường dữ liệu tính khoảng 12 ký tự).
  function autoFitColumn(col: number) {
    let widest = 0;
    for (let r = 1; r <= rows; r++) {
      if (merges.covered.has(`${r}:${col}`) || merges.master.has(`${r}:${col}`)) continue;
      const cell = sheet.getCell(r, col);
      const text = textOf(cell);
      if (!text) continue;
      const size = Math.round((cell.font?.size ?? DEFAULT_FONT.size) * (4 / 3));
      const longest = text.split("\n").reduce((max, line) => Math.max(max, line.replace(/\{\{[^}]*\}\}/g, "xxxxxxxxxxxx").length), 0);
      widest = Math.max(widest, longest * size * 0.55 * (cell.font?.bold ? 1.08 : 1));
    }
    if (!widest) return;
    const px = Math.min(480, Math.max(40, Math.round(widest + 14)));
    mutate(() => (sheet.getColumn(col).width = (px - 5) / 7));
  }

  // ---- nhập liệu ----
  function commitEdit(refocus = true) {
    if (!editing) return;
    const { row, col, text } = editing;
    setEditing(null);
    const current = textOf(sheet.getCell(row, col));
    if (text !== current) {
      mutate(() => {
        const cell = sheet.getCell(row, col);
        cell.value = text === "" ? null : text;
        // Ô có xuống dòng thì tự bật bọc chữ để thấy các dòng (như Excel).
        if (text.includes("\n") && !cell.alignment?.wrapText) cell.alignment = { ...(cell.alignment ?? {}), wrapText: true };
      });
    }
    if (refocus) requestAnimationFrame(focusEditor);
  }
  function startEdit(row: number, col: number, initial?: string) {
    if (readOnly || preview) return;
    const target = masterOf(row, col);
    setEditing({ row: target.row, col: target.col, text: initial ?? textOf(sheet.getCell(target.row, target.col)), mode: initial === undefined ? "edit" : "enter" });
  }
  function addToken(key: string, row = sel.ar, col = sel.ac, mod?: TokenMod) {
    const token = mod ? `{{${key}|${mod}}}` : `{{${key}}}`;
    if (editing) {
      const element = editor.current;
      const start = element?.selectionStart ?? editing.text.length;
      const end = element?.selectionEnd ?? editing.text.length;
      const text = editing.text.slice(0, start) + token + editing.text.slice(end);
      setEditing({ ...editing, text });
      caret.current = { row: editing.row, col: editing.col, start: start + token.length, end: start + token.length };
      requestAnimationFrame(() => {
        element?.focus();
        element?.setSelectionRange(start + token.length, start + token.length);
      });
      return;
    }
    const target = masterOf(row, col);
    const remembered = caret.current && caret.current.row === target.row && caret.current.col === target.col ? caret.current : null;
    mutate(() => {
      const cell = sheet.getCell(target.row, target.col);
      const current = textOf(cell);
      if (remembered) {
        // Chèn đúng vị trí con trỏ đã đặt trong ô (thay phần đang bôi đen nếu có).
        const from = Math.min(remembered.start, current.length);
        const to = Math.min(Math.max(remembered.end, from), current.length);
        cell.value = current.slice(0, from) + token + current.slice(to);
        caret.current = { row: target.row, col: target.col, start: from + token.length, end: from + token.length };
      } else {
        cell.value = current ? `${current} ${token}` : token;
      }
    });
  }

  const reveal = (row: number, col: number) =>
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-cell="${row}:${col}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" }));

  // Di chuyển ô đang chọn; extend (giữ Shift) thì mở rộng vùng chọn từ đầu còn lại, như Excel.
  function moveSelection(dr: number, dc: number, extend = false) {
    const focusRow = sel.r1 === sel.ar ? sel.r2 : sel.r1;
    const focusCol = sel.c1 === sel.ac ? sel.c2 : sel.c1;
    const row = Math.min(rows, Math.max(1, (extend ? focusRow : sel.ar) + dr));
    const col = Math.min(cols, Math.max(1, (extend ? focusCol : sel.ac) + dc));
    select(row, col, extend);
    reveal(row, col);
  }

  // Ngắt dòng trong cùng một ô (Alt+Enter hoặc nút trên thanh công cụ): đang sửa thì chèn xuống dòng tại con trỏ, chưa sửa thì vào chế độ sửa rồi xuống dòng ở cuối.
  function insertLineBreak() {
    if (readOnly || preview) return;
    const element = editor.current;
    if (editing && !editing.bar && element) {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      setEditing({ ...editing, text: `${editing.text.slice(0, start)}\n${editing.text.slice(end)}` });
      requestAnimationFrame(() => {
        element.focus({ preventScroll: true });
        element.setSelectionRange(start + 1, start + 1);
      });
      return;
    }
    if (editing?.bar) return;
    const target = masterOf(sel.ar, sel.ac);
    setEditing({ row: target.row, col: target.col, text: `${textOf(sheet.getCell(target.row, target.col))}\n`, mode: "edit" });
  }

  function setPage(patch: { paperSize?: number; orientation?: "portrait" | "landscape" }) {
    if (readOnly) return;
    applyPageSetup(sheet, patch);
    setTick((value) => value + 1);
    onDirty?.();
  }

  async function downloadPreview() {
    setDownloading(true);
    try {
      defaultPageSetup(workbook.worksheets[0]);
      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
      const name = await downloadTemplatePreview(buffer, buildPreviewPayload(fields));
      toast.success(`Đã tải file xem trước: ${name}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error), { duration: 10000 });
    } finally {
      setDownloading(false);
    }
  }

  const arrowStep: Record<string, [number, number]> = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  const FONT_STEPS = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48];

  function stepFontSize(direction: 1 | -1) {
    const current = font.size ?? DEFAULT_FONT.size;
    const next = direction === 1 ? FONT_STEPS.find((v) => v > current) : [...FONT_STEPS].reverse().find((v) => v < current);
    if (next) setFont({ size: next });
  }

  // Ctrl + mũi tên: nhảy tới mép vùng dữ liệu như Excel.
  function jumpSelection(dr: number, dc: number, extend: boolean) {
    const filled = (r: number, c: number) => Boolean(textOf(sheet.getCell(r, c)));
    let r = extend ? (sel.r1 === sel.ar ? sel.r2 : sel.r1) : sel.ar;
    let c = extend ? (sel.c1 === sel.ac ? sel.c2 : sel.c1) : sel.ac;
    const inside = (rr: number, cc: number) => rr >= 1 && rr <= rows && cc >= 1 && cc <= cols;
    if (!inside(r + dr, c + dc)) return;
    if (filled(r, c) && filled(r + dr, c + dc)) {
      while (inside(r + dr, c + dc) && filled(r + dr, c + dc)) {
        r += dr;
        c += dc;
      }
    } else {
      r += dr;
      c += dc;
      while (inside(r + dr, c + dc) && !filled(r, c)) {
        r += dr;
        c += dc;
      }
    }
    select(r, c, extend);
    reveal(r, c);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (editing || preview) return;
    const meta = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const move = (dr: number, dc: number, extend = event.shiftKey) => {
      event.preventDefault();
      moveSelection(dr, dc, extend);
    };
    if (meta && key === "s") return void (event.preventDefault(), onSave?.());
    if (meta && key === "z") return void (event.preventDefault(), event.shiftKey ? redo() : undo());
    if (meta && key === "y") return void (event.preventDefault(), redo());
    if (meta && key === "b") return void (event.preventDefault(), toggleFont("bold"));
    if (meta && key === "i") return void (event.preventDefault(), toggleFont("italic"));
    if (meta && key === "u") return void (event.preventDefault(), toggleFont("underline"));
    if (meta && event.shiftKey && key === "r") return void (event.preventDefault(), setAlign({ horizontal: "right" }));
    if (meta && key === "e") return void (event.preventDefault(), setAlign({ horizontal: "center" }));
    if (meta && key === "l") return void (event.preventDefault(), setAlign({ horizontal: "left" }));
    if (meta && key === "d") return void (event.preventDefault(), fill("down"));
    if (meta && key === "r") return void (event.preventDefault(), fill("right"));
    if (meta && (event.key === "+" || event.key === "=")) return void (event.preventDefault(), shiftSheet(sel.r1 === 1 && sel.r2 === rows ? "col" : "row", "insert"));
    if (meta && (event.key === "-" || event.key === "_")) return void (event.preventDefault(), shiftSheet(sel.r1 === 1 && sel.r2 === rows ? "col" : "row", "delete"));
    if (meta && event.shiftKey && event.key === ">") return void (event.preventDefault(), stepFontSize(1));
    if (meta && event.shiftKey && event.key === "<") return void (event.preventDefault(), stepFontSize(-1));
    if (meta && event.key === " ") return void (event.preventDefault(), setSel((cur) => ({ ...cur, r1: 1, r2: rows, c1: cur.c1, c2: cur.c2, ar: 1 })));
    if (meta && event.key === "End") return void (event.preventDefault(), select(Math.max(1, sheet.rowCount), Math.max(1, sheet.columnCount)), reveal(Math.max(1, sheet.rowCount), Math.max(1, sheet.columnCount)));
    if (meta && arrowStep[event.key]) return void (event.preventDefault(), jumpSelection(arrowStep[event.key][0], arrowStep[event.key][1], event.shiftKey));
    if (!meta && event.shiftKey && event.key === " ") return void (event.preventDefault(), setSel((cur) => ({ ...cur, c1: 1, c2: cols, r1: cur.r1, r2: cur.r2, ac: 1 })));
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      const rect = gridRef.current?.querySelector(`[data-cell="${sel.ar}:${sel.ac}"]`)?.getBoundingClientRect();
      return void setMenu({ x: (rect?.left ?? 200) + 12, y: (rect?.bottom ?? 200) - 4, kind: "cell" });
    }
    if (event.key === "Escape" && painterRef.current) return void (painterRef.current = null, setPainter(null));
    if (meta && key === "a") return void (event.preventDefault(), setSel({ ar: 1, ac: 1, r1: 1, c1: 1, r2: rows, c2: cols }));
    if (meta && event.key === "Home") return void (event.preventDefault(), select(1, 1), reveal(1, 1));
    if (meta) return; // Ctrl+C / X / V do trình duyệt phát sự kiện copy / cut / paste
    if (event.key === "ArrowDown") return move(1, 0);
    if (event.key === "ArrowUp") return move(-1, 0);
    if (event.key === "ArrowLeft") return move(0, -1);
    if (event.key === "ArrowRight") return move(0, 1);
    if (event.key === "PageDown") return move(15, 0);
    if (event.key === "PageUp") return move(-15, 0);
    if (event.key === "Home") return move(0, -cols);
    if (event.key === "End") return move(0, cols);
    if (event.key === "Tab") return move(0, event.shiftKey ? -1 : 1, false);
    if (event.key === "Enter" && event.altKey) return void (event.preventDefault(), insertLineBreak());
    if (event.key === "Enter") return move(event.shiftKey ? -1 : 1, 0, false);
    if (event.key === "F2") return void (event.preventDefault(), startEdit(sel.ar, sel.ac));
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      if (imageIndex !== null) return removeImage();
      clearContents();
    }
    // Phím chữ: không chặn, ô nhập sẵn có sẽ nhận (giữ nguyên bộ gõ tiếng Việt) và chuyển sang chế độ nhập.
  }

  function onEditorBlur() {
    if (editing && !editing.bar) commitEdit(false);
  }

  // Gõ khi chưa sửa = bắt đầu chế độ gõ (thay nội dung ô) ngay trên chính ô nhập này nên bộ gõ tiếng Việt không bị gián đoạn.
  function onEditorChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = event.target.value;
    setEditing(editing && !editing.bar ? { ...editing, text } : { row: barCell.row, col: barCell.col, text, mode: "enter" });
  }

  // Phím trong ô nhập khi đang sửa: Enter / Tab chốt và di chuyển; ở chế độ gõ mới (không phải F2 / bấm đúp) mũi tên chốt và di chuyển như Excel.
  function onEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      event.stopPropagation();
      if (editing && !editing.bar) commitEdit(false);
      requestAnimationFrame(() => requestAnimationFrame(() => onSave?.()));
      return;
    }
    if (!editing || editing.bar) return; // chưa sửa: để lưới xử lý (di chuyển, xóa, phím tắt)
    event.stopPropagation();
    const arrows: Record<string, [number, number]> = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (event.key === "Escape") {
      setEditing(null);
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      setEditing({ ...editing, mode: editing.mode === "edit" ? "enter" : "edit" });
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      const text = editing.text;
      setEditing(null);
      mutate(() => forEachSelected((cell) => (cell.value = text === "" ? null : text)));
      return;
    }
    if (event.key === "Enter" && event.altKey) {
      event.preventDefault();
      insertLineBreak();
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      commitEdit(false);
      moveSelection(event.key === "Enter" ? (event.shiftKey ? -1 : 1) : 0, event.key === "Tab" ? (event.shiftKey ? -1 : 1) : 0);
      return;
    }
    if (editing.mode === "enter" && arrows[event.key] && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      commitEdit(false);
      moveSelection(arrows[event.key][0], arrows[event.key][1], event.shiftKey);
    }
  }

  // ---- kéo đổi kích thước ----
  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (frame.current) {
        setGridHeight(Math.min(1400, Math.max(240, frame.current.height + (event.clientY - frame.current.start))));
        return;
      }
      const resize = imageResize.current;
      if (resize) {
        const item = (sheet as unknown as { _media: MediaLike[] })._media[resize.index];
        if (!item) return;
        const { colOffsets: cOff, rowOffsets: rOff } = latest.current;
        const z = zoomRef.current;
        const ddx = (event.clientX - resize.startX) / z;
        const ddy = (event.clientY - resize.startY) / z;
        let w = resize.width + resize.dx * ddx;
        let h = resize.height + resize.dy * ddy;
        // Kéo ở góc: giữ nguyên tỉ lệ ảnh như Excel.
        if (resize.dx !== 0 && resize.dy !== 0) {
          const scale = Math.max(w / resize.width, h / resize.height);
          w = resize.width * scale;
          h = resize.height * scale;
        }
        w = Math.max(16, w);
        h = Math.max(16, h);
        const left = resize.dx < 0 ? resize.left + (resize.width - w) : resize.left;
        const top = resize.dy < 0 ? resize.top + (resize.height - h) : resize.top;
        setAnchorIndex(sheet, item.range.tl, "col", indexAt(cOff, left));
        setAnchorIndex(sheet, item.range.tl, "row", indexAt(rOff, top));
        if (item.range.ext) {
          item.range.ext = { width: w, height: h };
        } else if (item.range.br) {
          setAnchorIndex(sheet, item.range.br, "col", indexAt(cOff, left + w));
          setAnchorIndex(sheet, item.range.br, "row", indexAt(rOff, top + h));
        }
        forceResize((value) => value + 1);
        return;
      }
      const imgDrag = imageDrag.current;
      if (imgDrag) {
        const item = (sheet as unknown as { _media: MediaLike[] })._media[imgDrag.index];
        if (!item) return;
        const { colOffsets: cOff, rowOffsets: rOff } = latest.current;
        const z = zoomRef.current;
        const newCol = indexAt(cOff, posAt(cOff, imgDrag.col) + (event.clientX - imgDrag.startX) / z);
        const newRow = indexAt(rOff, posAt(rOff, imgDrag.row) + (event.clientY - imgDrag.startY) / z);
        setAnchorIndex(sheet, item.range.tl, "col", newCol);
        setAnchorIndex(sheet, item.range.tl, "row", newRow);
        if (item.range.br && imgDrag.brCol !== undefined && imgDrag.brRow !== undefined) {
          setAnchorIndex(sheet, item.range.br, "col", imgDrag.brCol + (newCol - imgDrag.col));
          setAnchorIndex(sheet, item.range.br, "row", imgDrag.brRow + (newRow - imgDrag.row));
        }
        forceResize((value) => value + 1);
        return;
      }
      const drag = resizing.current;
      if (!drag) return;
      if (drag.kind === "col") {
        const px = Math.max(24, drag.size + (event.clientX - drag.start) / zoomRef.current);
        sheet.getColumn(drag.index).width = (px - 5) / 7;
      } else {
        const px = Math.max(14, drag.size + (event.clientY - drag.start) / zoomRef.current);
        sheet.getRow(drag.index).height = px * 0.75;
      }
      forceResize((value) => value + 1);
    }
    function onUp(event: MouseEvent) {
      frame.current = null;
      if (moveDrag.current) {
        moveDrag.current = null;
        latest.current.applyMove(event.ctrlKey || event.metaKey);
        dragging.current = false;
        return;
      }
      if (imageResize.current) {
        imageResize.current = null;
        setTick((value) => value + 1);
        setCanHistory({ undo: history.current.length > 0, redo: false });
        onDirty?.();
      }
      if (imageDrag.current) {
        imageDrag.current = null;
        setTick((value) => value + 1);
        setCanHistory({ undo: history.current.length > 0, redo: false });
        onDirty?.();
      }
      if (fillDrag.current) {
        fillDrag.current = false;
        latest.current.applyFill();
      } else if (dragging.current && painterRef.current) {
        latest.current.applyPainter();
      }
      if (resizing.current) {
        resizing.current = null;
        setTick((value) => value + 1);
        setCanHistory({ undo: history.current.length > 0, redo: false });
        onDirty?.();
      }
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onDirty, sheet]);

  function startResize(event: React.MouseEvent, kind: "col" | "row", index: number) {
    event.preventDefault();
    event.stopPropagation();
    if (readOnly) return;
    history.current.push(snapshot());
    future.current = [];
    resizing.current = { kind, index, start: kind === "col" ? event.clientX : event.clientY, size: kind === "col" ? colPx(sheet.getColumn(index).width) : rowPx(sheet.findRow(index)?.height) };
  }

  // ---- ảnh ----
  const images = useMemo(() => {
    void tick;
    return sheet.getImages().map((item, index) => {
      const media = workbook.getImage(Number(item.imageId));
      const real = item.range as unknown as MediaLike["range"];
      const range = {
        tl: { col: anchorIndex(sheet, real.tl, "col"), row: anchorIndex(sheet, real.tl, "row") },
        br: real.br ? { col: anchorIndex(sheet, real.br, "col"), row: anchorIndex(sheet, real.br, "row") } : undefined,
        ext: real.ext,
      };
      return { index, media, range };
    });
  }, [sheet, workbook, tick]);

  const computedColOffsets = useMemo(() => {
    void tick;
    const offsets: number[] = [0];
    for (let c = 1; c <= cols + 12; c++) offsets.push(offsets[c - 1] + colPx(sheet.getColumn(c).width));
    return offsets;
  }, [sheet, cols, tick]);
  const computedRowOffsets = useMemo(() => {
    void tick;
    const offsets: number[] = [0];
    for (let r = 1; r <= rows + 12; r++) offsets.push(offsets[r - 1] + rowPx(sheet.findRow(r)?.height));
    return offsets;
  }, [sheet, rows, tick]);
  // Đo kích thước thật trên màn hình (độ rộng cột, chiều cao dòng - dòng có chữ xuống dòng tự cao lên như Excel - và cỡ ô tiêu đề)
  // để viền chọn, ảnh và ô nhập luôn khớp đúng vị trí ô.
  const [measure, setMeasure] = useState<{ cols: number[]; rows: number[]; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const ths = root.querySelectorAll<HTMLElement>("thead th");
    const trs = root.querySelectorAll<HTMLElement>("tbody > tr");
    if (!ths.length) return;
    // Đo bằng kích thước thập phân (không làm tròn) chia cho mức thu phóng để không cộng dồn sai số theo số dòng / cột.
    const z = zoom / 100;
    const px = (value: number) => Math.round((value / z) * 100) / 100;
    const measuredCols = [0];
    ths.forEach((th, index) => {
      if (index > 0) measuredCols.push(measuredCols[measuredCols.length - 1] + px(th.getBoundingClientRect().width));
    });
    for (let i = 0; i < 12; i++) measuredCols.push(measuredCols[measuredCols.length - 1] + 64);
    const measuredRows = [0];
    trs.forEach((tr) => measuredRows.push(measuredRows[measuredRows.length - 1] + px(tr.getBoundingClientRect().height)));
    for (let i = 0; i < 12; i++) measuredRows.push(measuredRows[measuredRows.length - 1] + 20);
    const next = { cols: measuredCols, rows: measuredRows, w: px(ths[0].getBoundingClientRect().width), h: px(ths[0].parentElement?.getBoundingClientRect().height ?? 24) };
    setMeasure((cur) =>
      cur && cur.w === next.w && cur.h === next.h && cur.cols.length === next.cols.length && cur.rows.length === next.rows.length && cur.cols.every((v, i) => v === next.cols[i]) && cur.rows.every((v, i) => v === next.rows[i])
        ? cur
        : next,
    );
  }, [tick, rows, cols, preview, zoom, resizeCount, fullscreen, gridHeight, sheet]);
  const useMeasured = !preview && measure !== null && measure.rows.length >= rows + 1 && measure.cols.length >= cols + 1;
  const rowOffsets = useMeasured && measure ? measure.rows : computedRowOffsets;
  const colOffsets = useMeasured && measure ? measure.cols : computedColOffsets;
  const chromeW = measure?.w ?? 40;
  const chromeH = measure?.h ?? 24;
  // Khổ giấy / hướng in lưu trong chính file Excel (thiết lập trang); mặc định A4 dọc. Mép trang in vẽ nét đứt xanh như Excel.
  const paperId = sheet.pageSetup?.paperSize ?? 9;
  const orientation: "portrait" | "landscape" = sheet.pageSetup?.orientation === "landscape" ? "landscape" : "portrait";
  const printable = printableSize(paperId, orientation, sheet.pageSetup?.margins);
  const pageLines = (() => {
    if (preview || !showBreaks) return { v: [] as number[], h: [] as number[] };
    const width = colOffsets[cols] ?? 0;
    const height = rowOffsets[rows] ?? 0;
    const v: number[] = [];
    const h: number[] = [];
    for (let x = printable.w; x < width && v.length < 8; x += printable.w) v.push(x);
    for (let y = printable.h; y < height && h.length < 12; y += printable.h) h.push(y);
    return { v, h };
  })();
  const at = posAt;

  const imageUrls = useMemo(() => {
    return images.map((item) => {
      const buffer = item.media?.buffer as unknown as ArrayBuffer | undefined;
      if (!buffer) return null;
      return URL.createObjectURL(new Blob([buffer], { type: `image/${item.media?.extension === "jpeg" ? "jpeg" : item.media?.extension ?? "png"}` }));
    });
  }, [images]);
  useEffect(() => () => imageUrls.forEach((url) => url && URL.revokeObjectURL(url)), [imageUrls]);

  function onImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const extension = file.type === "image/jpeg" ? "jpeg" : file.type === "image/gif" ? "gif" : file.type === "image/png" ? "png" : null;
    if (!extension) return;
    void file.arrayBuffer().then((buffer) => {
      const url = URL.createObjectURL(file);
      const probe = new Image();
      probe.onload = () => {
        const height = Math.min(90, probe.naturalHeight);
        const width = Math.round((probe.naturalWidth / probe.naturalHeight) * height);
        URL.revokeObjectURL(url);
        mutate(() => {
          const id = workbook.addImage({ buffer: buffer as unknown as never, extension });
          sheet.addImage(id, { tl: { col: sel.ac - 1, row: sel.ar - 1 }, ext: { width, height } });
        });
      };
      probe.src = url;
    });
  }
  function startImageResize(event: React.MouseEvent, index: number, dx: -1 | 0 | 1, dy: -1 | 0 | 1, left: number, top: number, width: number, height: number) {
    event.preventDefault();
    event.stopPropagation();
    history.current.push(snapshot());
    future.current = [];
    imageResize.current = { index, dx, dy, startX: event.clientX, startY: event.clientY, left, top, width, height };
  }

  function removeImage() {
    if (imageIndex === null) return;
    mutate(() => {
      const media = (sheet as unknown as { _media: unknown[] })._media;
      media.splice(imageIndex, 1);
    });
    setImageIndex(null);
  }

  // ---- hiển thị ----
  const label = useMemo(() => new Map(fields.map((field) => [field.key, field.label])), [fields]);
  const selected = (r: number, c: number) => !preview && r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2;
  const lineHeight = (row: number) => rowPx(sheet.findRow(row)?.height);
  const columnKeys = useMemo(() => new Set(fields.filter((field) => field.kind === "COLUMN").map((field) => field.key)), [fields]);
  // Xem trước: dòng đầu tiên chứa trường cột được nhân lên PREVIEW_ROWS lần như khi xuất thật.
  const rowList = useMemo(() => {
    void tick;
    const list: { r: number; k: number }[] = [];
    let dataRow = -1;
    if (preview) {
      for (let r = 1; r <= rows && dataRow < 0; r++) {
        for (let c = 1; c <= cols; c++) {
          const value = textOf(sheet.getCell(r, c));
          if ([...value.matchAll(/\{\{\s*([A-Za-z]+)\s*(?:\|\s*(?:upper|lower|title)\s*)?\}\}/g)].some((match) => columnKeys.has(match[1]))) {
            dataRow = r;
            break;
          }
        }
      }
    }
    for (let r = 1; r <= rows; r++) {
      if (r === dataRow) for (let k = 0; k < PREVIEW_ROWS; k++) list.push({ r, k });
      else list.push({ r, k: 0 });
    }
    return list;
  }, [preview, rows, cols, sheet, tick, columnKeys]);
  // Viền chọn bao trọn các ô gộp mà vùng chọn chạm tới (như Excel).
  const selBox = (() => {
    let { r1, c1, r2, c2 } = sel;
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of merges.master.values()) {
        if (m.r1 <= r2 && m.r2 >= r1 && m.c1 <= c2 && m.c2 >= c1 && (m.r1 < r1 || m.r2 > r2 || m.c1 < c1 || m.c2 > c2)) {
          r1 = Math.min(r1, m.r1);
          r2 = Math.max(r2, m.r2);
          c1 = Math.min(c1, m.c1);
          c2 = Math.max(c2, m.c2);
          changed = true;
        }
      }
    }
    return { r1, c1, r2, c2 };
  })();

  // ---- kéo di chuyển ô / vùng chọn bằng mép viền chọn (giữ Ctrl để sao chép), như Excel ----
  function startMove(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (readOnly || preview) return;
    if (editing) commitEdit(false);
    const wrapper = (event.currentTarget as HTMLElement).closest("[data-sheet-wrap]") as HTMLElement | null;
    const rect = wrapper?.getBoundingClientRect();
    const z = zoomRef.current;
    const x = rect ? (event.clientX - rect.left) / z - chromeW : 0;
    const y = rect ? (event.clientY - rect.top) / z - chromeH : 0;
    const grabC = Math.min(selBox.c2, Math.max(selBox.c1, Math.floor(indexAt(colOffsets, x)) + 1));
    const grabR = Math.min(selBox.r2, Math.max(selBox.r1, Math.floor(indexAt(rowOffsets, y)) + 1));
    moveDrag.current = { grabR, grabC };
    dragging.current = true;
    const none = { dr: 0, dc: 0 };
    moveDeltaRef.current = none;
    setMoveDelta(none);
  }

  function applyMove(copy: boolean) {
    const raw = moveDeltaRef.current;
    moveDeltaRef.current = null;
    setMoveDelta(null);
    if (!raw || (raw.dr === 0 && raw.dc === 0)) return;
    const box = selBox;
    const dr = Math.min(MAX_ROWS - box.r2, Math.max(1 - box.r1, raw.dr));
    const dc = Math.min(MAX_COLS - box.c2, Math.max(1 - box.c1, raw.dc));
    if (dr === 0 && dc === 0) return;
    const dest = { r1: box.r1 + dr, r2: box.r2 + dr, c1: box.c1 + dc, c2: box.c2 + dc };
    mutate(() => {
      const items: { r: number; c: number; value: Cell["value"]; style: unknown }[] = [];
      for (let r = box.r1; r <= box.r2; r++) {
        for (let c = box.c1; c <= box.c2; c++) {
          const cell = sheet.getCell(r, c);
          items.push({ r, c, value: cell.value, style: JSON.parse(JSON.stringify(cell.style ?? {})) });
        }
      }
      const inside = (m: MergeRange) => m.r1 >= box.r1 && m.r2 <= box.r2 && m.c1 >= box.c1 && m.c2 <= box.c2;
      const carried = [...merges.master.values()].filter(inside);
      const hitsDest = (m: MergeRange) => m.r1 <= dest.r2 && m.r2 >= dest.r1 && m.c1 <= dest.c2 && m.c2 >= dest.c1;
      const unmerged = new Set<string>();
      const unmerge = (m: MergeRange) => {
        const key = `${m.r1}:${m.c1}`;
        if (unmerged.has(key)) return;
        unmerged.add(key);
        sheet.unMergeCells(cellAddress(m.r1, m.c1));
      };
      for (const m of merges.master.values()) if (hitsDest(m) || (!copy && inside(m))) unmerge(m);
      if (!copy) {
        for (const item of items) {
          const cell = sheet.getCell(item.r, item.c);
          cell.value = null;
          cell.style = {};
        }
      }
      for (const item of items) {
        const cell = sheet.getCell(item.r + dr, item.c + dc);
        cell.value = item.value;
        cell.style = JSON.parse(JSON.stringify(item.style)) as Cell["style"];
      }
      for (const m of carried) {
        sheet.mergeCells(`${cellAddress(m.r1 + dr, m.c1 + dc)}:${cellAddress(m.r2 + dr, m.c2 + dc)}`);
      }
    });
    setSel({ ar: dest.r1, ac: dest.c1, r1: dest.r1, c1: dest.c1, r2: dest.r2, c2: dest.c2 });
  }
  useEffect(() => {
    latest.current = { applyFill, applyPainter, applyMove, colOffsets, rowOffsets };
  });

  function rememberCaret(event: React.SyntheticEvent<HTMLTextAreaElement>) {
    if (!editing || editing.bar) return;
    const element = event.currentTarget;
    caret.current = { row: editing.row, col: editing.col, start: element.selectionStart, end: element.selectionEnd };
  }

  // Thả trường vào ô đang sửa: chèn {{trường}} tại con trỏ (không để trình duyệt chèn tên trường trơn).
  function onEditorDrop(event: React.DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    const dropped = /^([A-Za-z]+)(?:\|(upper|lower|title))?$/.exec(event.dataTransfer.getData("text/plain"));
    if (dropped && label.has(dropped[1])) addToken(dropped[1], undefined, undefined, dropped[2] as TokenMod | undefined);
  }

  const barCell = masterOf(sel.ar, sel.ac);
  const barText = editing ? editing.text : textOf(sheet.getCell(barCell.row, barCell.col));

  useEffect(() => {
    zoomRef.current = zoom / 100;
  }, [zoom]);
  // Ctrl + lăn chuột: thu phóng khung chỉnh sửa (đăng ký không thụ động để chặn thu phóng của trình duyệt).
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => Math.min(200, Math.max(50, current + (event.deltaY < 0 ? 10 : -10))));
    };
    grid.addEventListener("wheel", onWheel, { passive: false });
    return () => grid.removeEventListener("wheel", onWheel);
  }, []);
  // Sau khi đổi ô đang chọn, đưa focus về ô nhập (trừ khi đang ở thanh công thức / hộp chọn khác).
  useEffect(() => {
    if (preview || readOnly) return;
    const active = document.activeElement;
    if (!active || active === document.body || gridRef.current?.contains(active)) editor.current?.focus({ preventScroll: true });
  }, [sel, preview, readOnly]);
  // F2 / bấm đúp: đặt con trỏ ở cuối chữ hiện có.
  const editKey = editing && !editing.bar && editing.mode === "edit" ? `${editing.row}:${editing.col}` : null;
  useEffect(() => {
    if (!editKey) return;
    const element = editor.current;
    element?.focus({ preventScroll: true });
    element?.setSelectionRange(element.value.length, element.value.length);
  }, [editKey]);

  const modeButton = (active: boolean) => cn("flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold", active ? "bg-white text-primary shadow-sm" : "text-text-secondary");
  function switchMode(next: boolean) {
    if (editing) commitEdit(false);
    setPreview(next);
  }

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", fullscreen && "fixed inset-0 z-40 overflow-hidden bg-white p-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-surface-1 p-0.5" role="tablist">
          <button aria-selected={!preview} className={modeButton(!preview)} onClick={() => switchMode(false)} role="tab" type="button">
            <PencilSimple size={15} /> Soạn mẫu
          </button>
          <button aria-selected={preview} className={modeButton(preview)} onClick={() => switchMode(true)} role="tab" type="button">
            <Eye size={15} /> Xem trước
          </button>
        </div>
        {preview ? (
          <>
            <span className="text-xs text-muted">Dữ liệu minh họa: dòng bảng được nhân lên {PREVIEW_ROWS} người như khi xuất thật.</span>
            <Button loading={downloading} onClick={() => void downloadPreview()} size="sm" title="Tải file Excel có dữ liệu mẫu, dựng bằng đúng bộ dựng khi xuất thật" type="button" variant="outline">
              <DownloadSimple size={16} /> Tải file xem trước
            </Button>
          </>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!fullscreen ? (
            <div className="flex items-center gap-1" title="Tăng / giảm chiều cao khung chỉnh sửa">
              <Button aria-label="Thu nhỏ khung chỉnh sửa" className="h-8 w-8 px-0" onClick={() => setGridHeight((value) => Math.max(240, value - 80))} size="sm" type="button" variant="outline">
                −
              </Button>
              <span className="text-xs text-muted">Khung</span>
              <Button aria-label="Mở rộng khung chỉnh sửa" className="h-8 w-8 px-0" onClick={() => setGridHeight((value) => Math.min(1400, value + 80))} size="sm" type="button" variant="outline">
                +
              </Button>
            </div>
          ) : null}
          <Button aria-label="Phím tắt" onClick={() => setHelpOpen(true)} size="sm" title="Phím tắt (như Excel)" type="button" variant="outline">
            <Keyboard size={16} /> Phím tắt
          </Button>
          <select aria-label="Thu phóng" className="h-8 rounded-md border border-input bg-white px-1.5 text-sm" onChange={(event) => setZoom(Number(event.target.value))} value={zoom}>
            {Array.from({ length: 16 }, (_, i) => 50 + i * 10).map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
          <Button onClick={onToggleFullscreen} size="sm" title={fullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"} type="button" variant="outline">
            {fullscreen ? <ArrowsInSimple size={16} /> : <ArrowsOutSimple size={16} />} {fullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          </Button>
          {actions}
        </div>
      </div>
      {!readOnly && !preview ? (
        <Toolbar
          canRedo={canHistory.redo}
          canUndo={canHistory.undo}
          font={font}
          horizontal={active.alignment?.horizontal}
          isMerged={isMerged}
          onAlign={setAlign}
          onBorders={setBorders}
          onFill={setFill}
          onFont={setFont}
          onImage={() => imageInput.current?.click()}
          onMerge={toggleMerge}
          onRedo={redo}
          onRemoveImage={imageIndex !== null ? removeImage : undefined}
          onToggle={toggleFont}
          onUndo={undo}
          fields={fields}
          onCase={applyCase}
          onField={(key, mod) => addToken(key, undefined, undefined, mod)}
          onShift={shiftSheet}
          onLineBreak={insertLineBreak}
          onOrientation={(value) => setPage({ orientation: value })}
          onPaper={(id) => setPage({ paperSize: id })}
          onShowBreaks={setShowBreaks}
          orientation={orientation}
          paperId={paperId}
          showBreaks={showBreaks}
          onPainter={startPainter}
          painterActive={Boolean(painter)}
          vertical={active.alignment?.vertical}
          wrap={Boolean(active.alignment?.wrapText)}
          fillColor={active.fill && active.fill.type === "pattern" ? argb((active.fill as { fgColor?: { argb?: string } }).fgColor) : undefined}
        />
      ) : null}
      {!preview ? (
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-20 shrink-0 place-items-center rounded-md border border-border bg-white text-sm font-semibold text-foreground">{cellAddress(sel.ar, sel.ac)}</div>
          <span className="shrink-0 text-sm font-semibold italic text-muted">fx</span>
          <input
            aria-label="Nội dung ô"
            data-formula-bar=""
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-white px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:bg-surface-1"
            disabled={readOnly}
            onBlur={() => editing?.bar && commitEdit(false)}
            onChange={(event) => setEditing({ ...(editing ?? { row: barCell.row, col: barCell.col }), text: event.target.value, bar: editing?.bar ?? true })}
            onFocus={() => !editing && !readOnly && setEditing({ row: barCell.row, col: barCell.col, text: textOf(sheet.getCell(barCell.row, barCell.col)), bar: true })}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitEdit();
              } else if (event.key === "Escape") {
                setEditing(null);
                focusEditor();
              }
            }}
            value={barText}
          />
        </div>
      ) : null}
      <input accept="image/png,image/jpeg,image/gif" className="hidden" onChange={onImageFile} ref={imageInput} type="file" />
      <div className="min-h-0">
        <div
          className="relative overflow-auto rounded-lg border border-border bg-white outline-none focus-within:ring-2 focus-within:ring-primary/30"
          onCopy={(event) => onCopy(event)}
          onCut={(event) => onCopy(event, true)}
          onPaste={onPaste}
          style={{ height: fullscreen ? "calc(100dvh - 210px)" : gridHeight, cursor: moveDelta ? "move" : painter ? "copy" : undefined }}
          onKeyDown={onKeyDown}
          ref={gridRef}
          tabIndex={0}
        >
          <div className="relative w-max" data-sheet-wrap="" style={{ zoom: zoom / 100 }}>
            {/* Chiều rộng tổng phải đặt rõ: tableLayout fixed với width auto vẫn bị trình duyệt giãn cột theo nội dung (vd. email dài ở tab Xem trước). */}
            <table className="border-separate border-spacing-0 select-none" style={{ tableLayout: "fixed", width: 40 + Array.from({ length: cols }, (_, index) => colPx(sheet.getColumn(index + 1).width)).reduce((sum, width) => sum + width, 0) }}>
              <colgroup>
                <col style={{ width: 40 }} />
                {Array.from({ length: cols }, (_, index) => (
                  <col key={index} style={{ width: colPx(sheet.getColumn(index + 1).width) }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 h-6 border-b border-r border-border bg-surface-2" />
                  {Array.from({ length: cols }, (_, index) => (
                    <th
                      className={cn("sticky top-0 z-20 h-6 border-b border-r border-border bg-surface-2 text-[11px] font-semibold text-text-secondary", index + 1 >= sel.c1 && index + 1 <= sel.c2 && "bg-primary-soft text-primary")}
                      key={index}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        if (!(sel.c1 <= index + 1 && sel.c2 >= index + 1 && sel.r1 === 1 && sel.r2 === rows)) setSel({ ar: 1, ac: index + 1, r1: 1, c1: index + 1, r2: rows, c2: index + 1 });
                        setMenu({ x: event.clientX, y: event.clientY, kind: "col" });
                      }}
                      onClick={(event) => setSel((cur) => (event.shiftKey ? { ...cur, r1: 1, r2: rows, c1: Math.min(cur.ac, index + 1), c2: Math.max(cur.ac, index + 1) } : { ar: 1, ac: index + 1, r1: 1, c1: index + 1, r2: rows, c2: index + 1 }))}
                    >
                      {colLetter(index + 1)}
                      <span className="absolute right-0 top-0 z-10 h-full w-2.5 cursor-col-resize hover:bg-primary/40" onClick={(event) => event.stopPropagation()} onDoubleClick={() => autoFitColumn(index + 1)} onMouseDown={(event) => startResize(event, "col", index + 1)} title="Kéo để đổi độ rộng, bấm đúp để tự khớp" />
                      {index > 0 ? (
                        <span className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-primary/40" onClick={(event) => event.stopPropagation()} onDoubleClick={() => autoFitColumn(index)} onMouseDown={(event) => startResize(event, "col", index)} title="Kéo để đổi độ rộng, bấm đúp để tự khớp" />
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowList.map(({ r, k }, rowIndex) => {
                  return (
                    <tr key={`${r}:${k}`} style={{ height: lineHeight(r) }}>
                      <th
                        className={cn("sticky left-0 z-10 border-b border-r border-border bg-surface-2 text-[11px] font-normal text-text-secondary", r >= sel.r1 && r <= sel.r2 && "bg-primary-soft text-primary")}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (!(sel.r1 <= r && sel.r2 >= r && sel.c1 === 1 && sel.c2 === cols)) setSel({ ar: r, ac: 1, r1: r, c1: 1, r2: r, c2: cols });
                          setMenu({ x: event.clientX, y: event.clientY, kind: "row" });
                        }}
                        onClick={(event) => setSel((cur) => (event.shiftKey ? { ...cur, c1: 1, c2: cols, r1: Math.min(cur.ar, r), r2: Math.max(cur.ar, r) } : { ar: r, ac: 1, r1: r, c1: 1, r2: r, c2: cols }))}
                        style={{ position: "sticky" }}
                      >
                        {rowIndex + 1}
                        <span className="absolute bottom-0 left-0 z-10 h-2.5 w-full cursor-row-resize hover:bg-primary/40" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => startResize(event, "row", r)} />
                        {r > 1 ? <span className="absolute left-0 top-0 z-10 h-1.5 w-full cursor-row-resize hover:bg-primary/40" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => startResize(event, "row", r - 1)} /> : null}
                      </th>
                      {Array.from({ length: cols }, (_, colIndex) => {
                        const c = colIndex + 1;
                        if (merges.covered.has(`${r}:${c}`)) return null;
                        const range = merges.master.get(`${r}:${c}`);
                        const cell = sheet.getCell(r, c);
                        const cellFont = (cell.font ?? {}) as NonNullable<Cell["font"]>;
                        const align = cell.alignment ?? {};
                        const fill = cell.fill && cell.fill.type === "pattern" && cell.fill.pattern === "solid" ? argb((cell.fill as { fgColor?: { argb?: string } }).fgColor) : undefined;
                        const last = range ? sheet.getCell(range.r2, range.c2) : cell;
                        const border = cell.border ?? {};
                        const isEditing = !preview && !editing?.bar && editing?.row === r && editing?.col === c;
                        const text = textOf(cell);
                        const shown = preview ? sampleText(text, k) : text;
                        // Chữ không xuống dòng tràn sang các ô trống bên cạnh (như Excel): canh trái -> sang phải, canh phải -> sang trái, canh giữa -> hai bên.
                        let spillLeft = 0;
                        let spillRight = 0;
                        if (shown && !isEditing && !align.wrapText && !range) {
                          const emptyAt = (n: number) => !(merges.covered.has(`${r}:${n}`) || merges.master.has(`${r}:${n}`) || textOf(sheet.getCell(r, n)));
                          let right = 0;
                          for (let n = c + 1; n <= cols && emptyAt(n); n++) right += colPx(sheet.getColumn(n).width);
                          let left = 0;
                          for (let n = c - 1; n >= 1 && emptyAt(n); n--) left += colPx(sheet.getColumn(n).width);
                          if (!align.horizontal || align.horizontal === "left") spillRight = right;
                          else if (align.horizontal === "right") spillLeft = left;
                          else if (align.horizontal === "center") spillLeft = spillRight = Math.min(left, right);
                        }
                        const spill = spillLeft + spillRight > 0;
                        const content = (preview ? [{ text: shown } as { text: string; key?: string; mod?: TokenMod }] : splitTokens(text)).map((part, index) =>
                          part.key ? (
                            <span className="rounded bg-primary/10 px-0.5 font-sans text-[0.8em] font-semibold text-primary" key={index} title={part.text}>
                              {label.get(part.key) ?? part.text}
                              {part.mod === "upper" ? " · HOA" : part.mod === "lower" ? " · thường" : part.mod === "title" ? " · Hoa đầu" : ""}
                            </span>
                          ) : (
                            <span key={index}>{part.text}</span>
                          ),
                        );
                        return (
                          <td
                            className={cn("relative border-b border-r border-slate-200 px-1 leading-snug", spill ? "overflow-visible" : "overflow-hidden", selected(r, c) && !(sel.ar === r && sel.ac === c) && "bg-primary-soft/60")}
                            colSpan={range ? range.c2 - range.c1 + 1 : 1}
                            key={c}
                            data-cell={`${r}:${c}`}
                            onDoubleClick={() => !isEditing && startEdit(r, c)}
                            onDragOver={(event) => !readOnly && event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (preview) return;
                              const dropped = /^([A-Za-z]+)(?:\|(upper|lower|title))?$/.exec(event.dataTransfer.getData("text/plain"));
                              if (dropped && label.has(dropped[1])) {
                                select(r, c);
                                addToken(dropped[1], r, c, dropped[2] as TokenMod | undefined);
                              }
                            }}
                            onContextMenu={(event) => {
                              if (preview) return;
                              event.preventDefault();
                              if (editing) commitEdit(false);
                              if (!selected(r, c)) select(r, c);
                              setMenu({ x: event.clientX, y: event.clientY, kind: "cell" });
                            }}
                            onMouseDown={(event) => {
                              if (preview || event.button !== 0) return;
                              event.preventDefault();
                              if (editing) commitEdit(false);
                              dragging.current = true;
                              select(r, c, event.shiftKey);
                              focusEditor();
                            }}
                            onMouseEnter={() => {
                              if (moveDrag.current) {
                                const delta = { dr: r - moveDrag.current.grabR, dc: c - moveDrag.current.grabC };
                                moveDeltaRef.current = delta;
                                setMoveDelta(delta);
                                return;
                              }
                              if (fillDrag.current) {
                                const target = { r, c };
                                fillTargetRef.current = target;
                                setFillTarget(target);
                                return;
                              }
                              if (dragging.current && !editing) select(r, c, true);
                            }}
                            rowSpan={range ? range.r2 - range.r1 + 1 : 1}
                            style={{
                              fontFamily: `"${cellFont.name ?? DEFAULT_FONT.name}", serif`,
                              fontSize: `${Math.round((cellFont.size ?? DEFAULT_FONT.size) * (4 / 3))}px`,
                              fontWeight: cellFont.bold ? 700 : 400,
                              fontStyle: cellFont.italic ? "italic" : "normal",
                              textDecoration: cellFont.underline ? "underline" : undefined,
                              color: argb(cellFont.color) ?? "#111",
                              background: fill,
                              textAlign: align.horizontal === "center" ? "center" : align.horizontal === "right" ? "right" : "left",
                              verticalAlign: align.vertical === "top" ? "top" : align.vertical === "middle" ? "middle" : "bottom",
                              whiteSpace: align.wrapText ? "pre-wrap" : "nowrap",
                              wordBreak: "break-word",
                              borderTop: borderCss(border.top),
                              borderLeft: borderCss(border.left),
                              borderBottom: borderCss(last.border?.bottom ?? border.bottom) ?? undefined,
                              borderRight: borderCss(last.border?.right ?? border.right) ?? undefined,
                            }}
                          >
                            {isEditing ? null : spill ? (
                              <span
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  bottom: 0,
                                  left: -spillLeft,
                                  width: colPx(sheet.getColumn(c).width) + spillLeft + spillRight,
                                  boxSizing: "border-box",
                                  padding: "0 4px",
                                  display: "flex",
                                  justifyContent: align.horizontal === "center" ? "center" : align.horizontal === "right" ? "flex-end" : "flex-start",
                                  alignItems: align.vertical === "top" ? "flex-start" : align.vertical === "middle" ? "center" : "flex-end",
                                  whiteSpace: "nowrap",
                                  zIndex: 1,
                                  overflow: "hidden",
                                  // Lớp chữ tràn phủ lên ô bên cạnh nhưng không được chặn chuột: bấm vào ô trống kế bên vẫn chọn ô đó.
                                  pointerEvents: "none",
                                }}
                              >
                                <span>{content}</span>
                              </span>
                            ) : (
                              content
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!preview ? (
              <div
                className="pointer-events-none absolute z-[6] border-2 border-primary"
                style={{
                  left: chromeW + colOffsets[selBox.c1 - 1] - 1,
                  top: chromeH + rowOffsets[selBox.r1 - 1] - 1,
                  width: colOffsets[selBox.c2] - colOffsets[selBox.c1 - 1] + 1,
                  height: rowOffsets[selBox.r2] - rowOffsets[selBox.r1 - 1] + 1,
                }}
              >
                {!readOnly && !moveDelta ? (
                  <>
                    <span className="pointer-events-auto absolute -top-[4px] left-0 right-0 z-[5] h-[7px] cursor-move" onMouseDown={startMove} />
                    <span className="pointer-events-auto absolute -bottom-[4px] left-0 right-3 z-[5] h-[7px] cursor-move" onMouseDown={startMove} />
                    <span className="pointer-events-auto absolute -left-[4px] bottom-0 top-0 z-[5] w-[7px] cursor-move" onMouseDown={startMove} />
                    <span className="pointer-events-auto absolute -right-[4px] bottom-3 top-0 z-[5] w-[7px] cursor-move" onMouseDown={startMove} />
                  </>
                ) : null}
                {!readOnly ? (
                  <span
                    className="pointer-events-auto absolute -bottom-[5px] -right-[5px] z-10 h-2.5 w-2.5 cursor-crosshair border border-white bg-primary"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      fillDrag.current = true;
                    }}
                    title="Kéo để điền"
                  />
                ) : null}
              </div>
            ) : null}
            {pageLines.v.map((x) => (
              <div className="pointer-events-none absolute z-[4] border-l-2 border-dashed border-blue-500/80" key={`pv${x}`} style={{ left: chromeW + x, top: chromeH, height: rowOffsets[rows] }} title="Mép trang in" />
            ))}
            {pageLines.h.map((y) => (
              <div className="pointer-events-none absolute z-[4] border-t-2 border-dashed border-blue-500/80" key={`ph${y}`} style={{ left: chromeW, top: chromeH + y, width: colOffsets[cols] }} title="Mép trang in" />
            ))}
            {moveDelta && !preview && (moveDelta.dr !== 0 || moveDelta.dc !== 0) ? (
              <div
                className="pointer-events-none absolute z-[6] border-2 border-dashed border-primary bg-primary/10"
                style={{
                  left: chromeW + colOffsets[Math.min(MAX_COLS - (selBox.c2 - selBox.c1), Math.max(1, selBox.c1 + moveDelta.dc)) - 1] - 1,
                  top: chromeH + rowOffsets[Math.min(MAX_ROWS - (selBox.r2 - selBox.r1), Math.max(1, selBox.r1 + moveDelta.dr)) - 1] - 1,
                  width: colOffsets[selBox.c2] - colOffsets[selBox.c1 - 1] + 1,
                  height: rowOffsets[selBox.r2] - rowOffsets[selBox.r1 - 1] + 1,
                }}
              />
            ) : null}
            {fillTarget && !preview ? (
              <div
                className="pointer-events-none absolute z-[6] border-2 border-dashed border-primary"
                style={{
                  left: chromeW + colOffsets[selBox.c1 - 1] - 1,
                  top: chromeH + rowOffsets[selBox.r1 - 1] - 1,
                  width: colOffsets[Math.max(sel.c2, fillTarget.r - sel.r2 >= fillTarget.c - sel.c2 ? sel.c2 : fillTarget.c)] - colOffsets[selBox.c1 - 1] + 1,
                  height: rowOffsets[Math.max(sel.r2, fillTarget.r - sel.r2 >= fillTarget.c - sel.c2 ? fillTarget.r : sel.r2)] - rowOffsets[selBox.r1 - 1] + 1,
                }}
              />
            ) : null}
            {!preview && !readOnly
              ? (() => {
                  const showEditor = Boolean(editing && !editing.bar);
                  const at0 = showEditor && editing ? { row: editing.row, col: editing.col } : barCell;
                  const span = merges.master.get(`${at0.row}:${at0.col}`);
                  const ecell = sheet.getCell(at0.row, at0.col);
                  const efont = (ecell.font ?? {}) as NonNullable<Cell["font"]>;
                  const px = Math.round((efont.size ?? DEFAULT_FONT.size) * (4 / 3));
                  const left = chromeW + colOffsets[at0.col - 1];
                  const top = chromeH + rowOffsets[at0.row - 1];
                  const width = colOffsets[span?.c2 ?? at0.col] - colOffsets[at0.col - 1];
                  const height = rowOffsets[span?.r2 ?? at0.row] - rowOffsets[at0.row - 1];
                  const lines = (editing?.text ?? "").split("\n");
                  const wide = Math.min(560, lines.reduce((max, line) => Math.max(max, line.length), 0) * px * 0.58 + 18);
                  return (
                    <textarea
                      aria-label="Ô nhập liệu"
                      autoComplete="off"
                      className={cn("absolute resize-none border-0 p-1 leading-snug", showEditor ? "z-20 bg-white outline outline-2 outline-primary" : "pointer-events-none opacity-0")}
                      onBlur={onEditorBlur}
                      onChange={onEditorChange}
                      onClick={rememberCaret}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={onEditorDrop}
                      onKeyDown={onEditorKeyDown}
                      onKeyUp={rememberCaret}
                      onSelect={rememberCaret}
                      ref={editor}
                      spellCheck={false}
                      style={
                        showEditor
                          ? {
                              left,
                              top,
                              width: Math.max(width, wide),
                              height: Math.max(height, lines.length * px * 1.4 + 8),
                              fontFamily: `"${efont.name ?? DEFAULT_FONT.name}", serif`,
                              fontSize: `${px}px`,
                              fontWeight: efont.bold ? 700 : 400,
                              fontStyle: efont.italic ? "italic" : "normal",
                              color: argb(efont.color) ?? "#111",
                            }
                          : { left, top, width: 1, height: 1 }
                      }
                      value={showEditor && editing ? editing.text : ""}
                    />
                  );
                })()
              : null}
            {/* Ảnh (logo): đặt chồng lên lưới theo ô neo; bấm để chọn rồi Delete để xóa. */}
            {images.map((item, index) => {
              const url = imageUrls[index];
              if (!url) return null;
              const left = chromeW + at(colOffsets, item.range.tl.col);
              const top = chromeH + at(rowOffsets, item.range.tl.row);
              const width = item.range.ext?.width ?? (item.range.br ? at(colOffsets, item.range.br.col) - at(colOffsets, item.range.tl.col) : 80);
              const height = item.range.ext?.height ?? (item.range.br ? at(rowOffsets, item.range.br.row) - at(rowOffsets, item.range.tl.row) : 80);
              const selectedImage = imageIndex === item.index && !readOnly;
              const relLeft = at(colOffsets, item.range.tl.col);
              const relTop = at(rowOffsets, item.range.tl.row);
              return (
                <Fragment key={index}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Ảnh trong mẫu"
                  className={cn("absolute z-[5] cursor-pointer object-fill", imageIndex === item.index && "outline outline-2 outline-primary")}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    if (!readOnly) {
                      history.current.push(snapshot());
                      future.current = [];
                      imageDrag.current = {
                        index: item.index,
                        startX: event.clientX,
                        startY: event.clientY,
                        col: item.range.tl.col,
                        row: item.range.tl.row,
                        brCol: item.range.br?.col,
                        brRow: item.range.br?.row,
                      };
                    }
                    setImageIndex(item.index);
                    focusEditor();
                  }}
                  src={url}
                  style={{ left, top, width, height }}
                />
                {selectedImage ? (
                  <ImageHandles
                    height={height}
                    left={left}
                    onStart={(event, dx, dy) => startImageResize(event, item.index, dx, dy, relLeft, relTop, width, height)}
                    top={top}
                    width={width}
                  />
                ) : null}
                </Fragment>
              );
            })}
          </div>
        </div>

        {!fullscreen ? (
          <div
            aria-label="Kéo để đổi chiều cao khung chỉnh sửa"
            className="mt-1 grid h-3 cursor-ns-resize place-items-center rounded hover:bg-primary-soft"
            onMouseDown={(event) => {
              event.preventDefault();
              frame.current = { start: event.clientY, height: gridHeight };
            }}
            role="separator"
          >
            <span className="h-0.5 w-12 rounded bg-slate-300" />
          </div>
        ) : null}
      </div>
      {menu ? (
        <ContextMenu
          items={
            menu.kind === "col"
              ? [
                  { label: "Cắt", hint: "Ctrl+X", run: () => void menuCopy(true) },
                  { label: "Sao chép", hint: "Ctrl+C", run: () => void menuCopy(false) },
                  { label: "Dán", hint: "Ctrl+V", run: () => void menuPaste() },
                  "-",
                  { label: "Chèn cột", hint: "Ctrl++", run: () => shiftSheet("col", "insert") },
                  { label: "Xóa cột", hint: "Ctrl+-", run: () => shiftSheet("col", "delete") },
                  { label: "Xóa nội dung", hint: "Delete", run: clearContents },
                  "-",
                  { label: "Độ rộng cột...", run: () => openSizeDialog("col") },
                  { label: "Tự khớp độ rộng cột", run: () => { for (let c = sel.c1; c <= sel.c2; c++) autoFitColumn(c); } },
                ]
              : menu.kind === "row"
                ? [
                    { label: "Cắt", hint: "Ctrl+X", run: () => void menuCopy(true) },
                    { label: "Sao chép", hint: "Ctrl+C", run: () => void menuCopy(false) },
                    { label: "Dán", hint: "Ctrl+V", run: () => void menuPaste() },
                    "-",
                    { label: "Chèn dòng", hint: "Ctrl++", run: () => shiftSheet("row", "insert") },
                    { label: "Xóa dòng", hint: "Ctrl+-", run: () => shiftSheet("row", "delete") },
                    { label: "Xóa nội dung", hint: "Delete", run: clearContents },
                    "-",
                    { label: "Chiều cao dòng...", run: () => openSizeDialog("row") },
                  ]
                : [
                    { label: "Cắt", hint: "Ctrl+X", run: () => void menuCopy(true) },
                    { label: "Sao chép", hint: "Ctrl+C", run: () => void menuCopy(false) },
                    { label: "Dán", hint: "Ctrl+V", run: () => void menuPaste() },
                    { label: "Dán chỉ giá trị", run: () => void menuPaste("values") },
                    { label: "Dán chỉ định dạng", run: () => void menuPaste("formats") },
                    "-",
                    { label: "Chèn dòng phía trên", hint: "Ctrl++", run: () => shiftSheet("row", "insert") },
                    { label: "Chèn cột bên trái", run: () => shiftSheet("col", "insert") },
                    { label: "Xóa dòng", hint: "Ctrl+-", run: () => shiftSheet("row", "delete") },
                    { label: "Xóa cột", run: () => shiftSheet("col", "delete") },
                    "-",
                    { label: "Xóa nội dung", hint: "Delete", run: clearContents },
                    { label: "Xóa định dạng", run: clearFormats },
                    { label: "Xóa tất cả", run: clearAll },
                    "-",
                    { label: isMerged ? "Bỏ gộp ô" : "Gộp ô", run: toggleMerge },
                    { label: "Sao chép định dạng", run: startPainter },
                    "-",
                    { label: "Độ rộng cột...", run: () => openSizeDialog("col") },
                    { label: "Chiều cao dòng...", run: () => openSizeDialog("row") },
                    { label: "Tự khớp độ rộng cột", run: () => { for (let c = sel.c1; c <= sel.c2; c++) autoFitColumn(c); } },
                  ]
          }
          onClose={() => {
            setMenu(null);
            requestAnimationFrame(focusEditor);
          }}
          x={menu.x}
          y={menu.y}
        />
      ) : null}
      {sizeDialog ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/30" onMouseDown={() => setSizeDialog(null)}>
          <form
            className="w-72 rounded-xl border border-border bg-white p-4 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              applySize();
            }}
          >
            <p className="text-sm font-semibold text-foreground">{sizeDialog.kind === "col" ? "Độ rộng cột (số ký tự)" : "Chiều cao dòng (point)"}</p>
            <input
              autoFocus
              className="mt-3 h-9 w-full rounded-md border border-input px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              inputMode="decimal"
              onChange={(event) => setSizeDialog({ ...sizeDialog, value: event.target.value })}
              onKeyDown={(event) => event.key === "Escape" && setSizeDialog(null)}
              value={sizeDialog.value}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setSizeDialog(null)} size="sm" type="button" variant="outline">
                Hủy
              </Button>
              <Button size="sm" type="submit" variant="primary">
                OK
              </Button>
            </div>
          </form>
        </div>
      ) : null}
      {helpOpen ? <ShortcutsDialog onClose={() => { setHelpOpen(false); requestAnimationFrame(focusEditor); }} /> : null}
    </div>
  );
});



// Menu chuột phải kiểu Excel; đóng khi bấm ra ngoài, nhấn Esc hoặc cuộn.
type MenuItem = "-" | { label: string; hint?: string; run: () => void };

function ContextMenu({ items, x, y, onClose }: { items: MenuItem[]; x: number; y: number; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) onClose();
    };
    const esc = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);
  return (
    <div className="fixed z-[80] w-56 rounded-lg border border-border bg-white py-1 shadow-xl" ref={box} style={{ left: Math.min(x, window.innerWidth - 232), top: Math.min(y, window.innerHeight - 340) }}>
      {items.map((item, index) => {
        if (item === "-") return <div className="my-1 h-px bg-border" key={index} />;
        const { label, hint, run } = item;
        return (
          <button
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-primary-soft"
            key={index}
            onClick={() => {
              run();
              onClose();
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {label}
            {hint ? <span className="text-xs text-muted">{hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}


const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: "Di chuyển và chọn",
    items: [
      ["Mũi tên / Tab / Enter", "Di chuyển ô (Shift: ngược lại hoặc mở rộng vùng chọn)"],
      ["Ctrl + Mũi tên", "Nhảy tới mép vùng dữ liệu"],
      ["Home / End", "Về đầu / cuối dòng"],
      ["Ctrl + Home / Ctrl + End", "Về A1 / ô cuối cùng có dữ liệu"],
      ["PageUp / PageDown", "Lên / xuống 15 dòng"],
      ["Ctrl + A", "Chọn tất cả"],
      ["Ctrl + Space / Shift + Space", "Chọn cả cột / cả dòng"],
    ],
  },
  {
    group: "Nhập liệu",
    items: [
      ["Gõ chữ", "Thay nội dung ô (hỗ trợ bộ gõ tiếng Việt)"],
      ["F2 hoặc bấm đúp", "Sửa nội dung, con trỏ ở cuối"],
      ["Enter / Tab", "Chốt và xuống / sang phải"],
      ["Esc", "Hủy sửa"],
      ["Alt + Enter", "Xuống dòng trong cùng một ô (tự bật bọc chữ)"],
      ["Ctrl + Enter", "Chốt và điền vào mọi ô đang chọn"],
      ["Delete", "Xóa nội dung"],
    ],
  },
  {
    group: "Chỉnh sửa",
    items: [
      ["Ctrl + C / X / V", "Sao chép / cắt / dán (cả với Excel bên ngoài)"],
      ["Ctrl + Z / Ctrl + Y", "Hoàn tác / làm lại"],
      ["Ctrl + lăn chuột", "Thu phóng khung chỉnh sửa (50% - 200%)"],
      ["Ctrl + S", "Lưu mẫu"],
      ["Ctrl + D / Ctrl + R", "Điền xuống / sang phải"],
      ["Ctrl + + / Ctrl + -", "Chèn / xóa dòng (hoặc cột khi đang chọn cả cột)"],
      ["Shift + F10", "Mở menu chuột phải"],
      ["Kéo chốt vuông ở góc vùng chọn", "Điền theo chiều kéo"],
      ["Kéo mép viền vùng chọn", "Di chuyển ô (giữ Ctrl để sao chép)"],
    ],
  },
  {
    group: "Định dạng",
    items: [
      ["Ctrl + B / I / U", "In đậm / nghiêng / gạch chân"],
      ["Ctrl + L / E / Shift + R", "Canh trái / giữa / phải"],
      ["Ctrl + Shift + > / <", "Tăng / giảm cỡ chữ"],
      ["Sao chép định dạng", "Chọn ô nguồn, bấm cọ rồi chọn vùng đích"],
      ["Bấm đúp mép cột", "Tự khớp độ rộng cột"],
    ],
  },
];

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const esc = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/30 p-4" onMouseDown={onClose}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Phím tắt</h2>
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            Đóng
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {SHORTCUTS.map((group) => (
            <section key={group.group}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{group.group}</h3>
              <ul className="space-y-1.5">
                {group.items.map(([keys, text]) => (
                  <li className="text-sm leading-5" key={keys}>
                    <kbd className="rounded border border-border bg-surface-1 px-1.5 py-0.5 font-sans text-xs font-semibold">{keys}</kbd>
                    <span className="ml-2 text-text-secondary">{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}


const IMAGE_HANDLES = [
  [-1, -1, 0, 0, "nwse-resize"],
  [0, -1, 0.5, 0, "ns-resize"],
  [1, -1, 1, 0, "nesw-resize"],
  [-1, 0, 0, 0.5, "ew-resize"],
  [1, 0, 1, 0.5, "ew-resize"],
  [-1, 1, 0, 1, "nesw-resize"],
  [0, 1, 0.5, 1, "ns-resize"],
  [1, 1, 1, 1, "nwse-resize"],
] as const;

/** Tám chốt co giãn quanh ảnh đang chọn; kéo ở góc giữ nguyên tỉ lệ. */
function ImageHandles({ left, top, width, height, onStart }: { left: number; top: number; width: number; height: number; onStart: (event: React.MouseEvent, dx: -1 | 0 | 1, dy: -1 | 0 | 1) => void }) {
  return (
    <>
      {IMAGE_HANDLES.map(([dx, dy, fx, fy, cursor]) => (
        <span
          className="absolute z-[7] h-2 w-2 border border-white bg-primary"
          key={`${dx}:${dy}`}
          onMouseDown={(event) => onStart(event, dx, dy)}
          style={{ left: left + fx * width - 4, top: top + fy * height - 4, cursor }}
          title="Kéo để co giãn ảnh (kéo ở góc giữ nguyên tỉ lệ)"
        />
      ))}
    </>
  );
}
