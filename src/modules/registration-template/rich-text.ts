import type { CellRichTextValue, Font } from "exceljs";

// Định dạng một phần chữ trong ô (đậm / nghiêng / gạch chân phần bôi đen) bằng rich text của exceljs:
// giá trị ô là { richText: [{ text, font }] }. Khi đang sửa, định dạng được giữ theo từng ký tự (CharFonts) song song với chữ,
// chữ đổi (gõ, xóa, dán, chèn trường) thì đồng bộ lại bằng so sánh đầu / cuối (syncChars).

export type RunFont = Partial<Font>;
/** Một phần tử cho mỗi ký tự: phần định dạng riêng của ký tự đó; undefined = theo font của ô. */
export type CharFonts = (RunFont | undefined)[];
export type StyleKey = "bold" | "italic" | "underline";

export function isRichText(value: unknown): value is CellRichTextValue {
  return typeof value === "object" && value !== null && Array.isArray((value as { richText?: unknown }).richText);
}

/** Chữ và định dạng từng ký tự của một giá trị ô (chữ thường thì không có định dạng riêng). */
export function charsOfValue(value: unknown, plainText: string): { text: string; chars: CharFonts } {
  if (!isRichText(value)) return { text: plainText, chars: new Array<RunFont | undefined>(plainText.length).fill(undefined) };
  const chars: CharFonts = [];
  let text = "";
  for (const part of value.richText) {
    text += part.text;
    for (let i = 0; i < part.text.length; i++) chars.push(part.font);
  }
  return { text, chars };
}

/**
 * Đưa định dạng từng ký tự khớp với chữ mới. Phần đổi là một đoạn liên tục (gõ, xóa, dán, chèn trường): ký tự mới chèn kế thừa định dạng
 * của ký tự đứng trước con trỏ (đầu chữ thì ký tự đầu), như Excel; thay cả chữ thì theo font của ô; thay đoạn cùng độ dài (đổi hoa / thường)
 * thì giữ nguyên định dạng.
 */
export function syncChars(oldText: string, newText: string, oldChars: CharFonts): CharFonts {
  if (oldText === newText) return oldChars;
  const limit = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < limit && oldText[prefix] === newText[prefix]) prefix++;
  let suffix = 0;
  while (suffix < limit - prefix && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]) suffix++;
  const removed = oldText.length - prefix - suffix;
  const inserted = newText.length - prefix - suffix;
  if (removed === inserted) return oldChars;
  const replacedAll = prefix === 0 && suffix === 0;
  const inherit = replacedAll ? undefined : prefix > 0 ? oldChars[prefix - 1] : oldChars[0];
  return [...oldChars.slice(0, prefix), ...new Array<RunFont | undefined>(inserted).fill(inherit), ...oldChars.slice(oldText.length - suffix)];
}

/** Mở rộng đoạn bôi đen cho trọn {{trường}} nếu chạm một phần của trường (không để một trường bị cắt làm nhiều đoạn khác định dạng). */
export function expandToTokens(text: string, start: number, end: number): { start: number; end: number } {
  let from = start;
  let to = end;
  for (const match of text.matchAll(/\{\{[^}]*\}\}/g)) {
    const matchStart = match.index ?? 0;
    const matchEnd = matchStart + match[0].length;
    if (matchStart < to && matchEnd > from) {
      from = Math.min(from, matchStart);
      to = Math.max(to, matchEnd);
    }
  }
  return { start: from, end: to };
}

function enabled(font: RunFont | undefined, base: RunFont, key: StyleKey): boolean {
  const value = font && key in font ? font[key] : base[key];
  return Boolean(value) && value !== "none";
}

/** Cả đoạn [start, end) đang có định dạng này (theo ký tự, hoặc theo font của ô nếu ký tự không có định dạng riêng). */
export function isFormatActive(chars: CharFonts, base: RunFont, start: number, end: number, key: StyleKey): boolean {
  if (end <= start) return enabled(undefined, base, key);
  for (let i = start; i < end; i++) if (!enabled(chars[i], base, key)) return false;
  return true;
}

/** Bật định dạng cho cả đoạn nếu chưa đủ bôi đen cả đoạn đang có, ngược lại tắt (như Excel). Không đổi mảng cũ. */
export function toggleFormat(chars: CharFonts, base: RunFont, start: number, end: number, key: StyleKey): CharFonts {
  const on = !isFormatActive(chars, base, start, end, key);
  const next = chars.slice();
  const cache = new Map<RunFont | undefined, RunFont>();
  for (let i = start; i < end && i < next.length; i++) {
    const previous = next[i];
    let changed = cache.get(previous);
    if (!changed) {
      changed = { ...(previous ?? {}), [key]: on ? true : false } as RunFont;
      cache.set(previous, changed);
    }
    next[i] = changed;
  }
  return next;
}

/** Bỏ định dạng riêng của một thuộc tính ở mọi ký tự (để cả ô theo font của ô). */
export function clearFormat(chars: CharFonts, key: StyleKey): CharFonts {
  const cache = new Map<RunFont, RunFont | undefined>();
  return chars.map((font) => {
    if (!font || !(key in font)) return font;
    if (!cache.has(font)) {
      const { [key]: _removed, ...rest } = font;
      void _removed;
      cache.set(font, Object.keys(rest).length ? (rest as RunFont) : undefined);
    }
    return cache.get(font);
  });
}

/** Áp một phần font lên các ký tự đã có định dạng riêng (đổi cỡ chữ, màu... cả ô); ký tự theo font của ô thì tự đổi theo ô. */
export function patchChars(chars: CharFonts, patch: RunFont): CharFonts {
  const cache = new Map<RunFont, RunFont>();
  return chars.map((font) => {
    if (!font) return font;
    if (!cache.has(font)) cache.set(font, { ...font, ...patch });
    return cache.get(font);
  });
}

/** Có ký tự nào mang định dạng khác font của ô không (không có thì lưu thành chữ thường). */
export function hasOverrides(chars: CharFonts, base: RunFont): boolean {
  return chars.some((font) => font !== undefined && (Object.keys(font) as (keyof RunFont)[]).some((key) => normalize(font[key]) !== normalize(base[key])));
}

function normalize(value: unknown): unknown {
  return value === false || value === "none" || value === undefined || value === null ? null : value;
}

function sameFont(a: RunFont | undefined, b: RunFont | undefined): boolean {
  if (a === b) return true;
  const left = a ?? {};
  const right = b ?? {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]) as Set<keyof RunFont>;
  for (const key of keys) if (JSON.stringify(normalize(left[key])) !== JSON.stringify(normalize(right[key]))) return false;
  return true;
}

/** Giá trị ô từ chữ + định dạng từng ký tự: có định dạng riêng thì rich text (mỗi đoạn mang font đầy đủ = font ô + phần riêng), không thì chữ thường. */
export function valueOfChars(text: string, chars: CharFonts, base: RunFont): string | CellRichTextValue {
  if (!hasOverrides(chars, base)) return text;
  const richText: CellRichTextValue["richText"] = [];
  let runStart = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || !sameFont(chars[i], chars[runStart])) {
      richText.push({ text: text.slice(runStart, i), font: { ...base, ...(chars[runStart] ?? {}) } });
      runStart = i;
    }
  }
  return { richText };
}

/** Áp một phần font lên mọi đoạn của giá trị rich text (đổi font cả ô); giá trị chữ thường giữ nguyên. */
export function patchRuns<T>(value: T, patch: RunFont): T {
  if (!isRichText(value)) return value;
  return { richText: value.richText.map((part) => ({ ...part, font: { ...(part.font ?? {}), ...patch } })) } as T;
}

/** Biến đổi chữ của từng đoạn (đổi hoa / thường cả ô) nhưng giữ định dạng từng đoạn. */
export function mapRunText<T>(value: T, fn: (text: string) => string): T {
  if (!isRichText(value)) return value;
  return { richText: value.richText.map((part) => ({ ...part, text: fn(part.text) })) } as T;
}
