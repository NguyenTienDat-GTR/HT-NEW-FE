import { describe, expect, it } from "vitest";
import { charsOfValue, clearFormat, expandToTokens, isFormatActive, patchRuns, syncChars, toggleFormat, valueOfChars, mapRunText, type CharFonts } from "@/modules/registration-template/rich-text";

const base = { name: "Times New Roman", size: 12 };
const none = (length: number): CharFonts => new Array(length).fill(undefined);

describe("toggleFormat", () => {
  it("chỉ in đậm phần bôi đen và tắt lại khi bấm lần nữa", () => {
    const bold = toggleFormat(none(11), base, 6, 11, "bold");
    expect(bold.map((font) => font?.bold ?? false)).toEqual([...new Array(6).fill(false), ...new Array(5).fill(true)]);
    expect(isFormatActive(bold, base, 6, 11, "bold")).toBe(true);
    const off = toggleFormat(bold, base, 6, 11, "bold");
    expect(isFormatActive(off, base, 6, 11, "bold")).toBe(false);
  });

  it("bôi đen có cả phần đã đậm và chưa đậm thì bật đậm cho cả đoạn", () => {
    const partial = toggleFormat(none(6), base, 0, 3, "bold");
    expect(isFormatActive(partial, base, 0, 6, "bold")).toBe(false);
    expect(isFormatActive(toggleFormat(partial, base, 0, 6, "bold"), base, 0, 6, "bold")).toBe(true);
  });

  it("giữ định dạng khác khi bật thêm nghiêng và không đổi mảng cũ", () => {
    const original = toggleFormat(none(4), base, 0, 4, "bold");
    const both = toggleFormat(original, base, 1, 3, "italic");
    expect(both[1]).toMatchObject({ bold: true, italic: true });
    expect(both[0]).toMatchObject({ bold: true });
    expect(both[0]?.italic).toBeUndefined();
    expect(original[1]).toEqual({ bold: true });
  });

  it("tôn trọng font của ô: ô đã đậm thì bôi đen một đoạn sẽ tắt đậm đoạn đó", () => {
    const boldBase = { ...base, bold: true };
    const result = toggleFormat(none(5), boldBase, 0, 2, "bold");
    expect(isFormatActive(result, boldBase, 0, 2, "bold")).toBe(false);
    expect(isFormatActive(result, boldBase, 2, 5, "bold")).toBe(true);
  });
});

describe("valueOfChars / charsOfValue", () => {
  it("không có định dạng riêng thì lưu chữ thường", () => {
    expect(valueOfChars("Xin chào", none(8), base)).toBe("Xin chào");
    expect(valueOfChars("Xin chào", toggleFormat(none(8), base, 0, 8, "bold").map(() => ({ bold: false })), base)).toBe("Xin chào");
  });

  it("gom các ký tự cùng định dạng thành từng đoạn với font đầy đủ", () => {
    const value = valueOfChars("Xin chào", toggleFormat(none(8), base, 4, 8, "bold"), base);
    expect(value).toEqual({
      richText: [
        { text: "Xin ", font: base },
        { text: "chào", font: { ...base, bold: true } },
      ],
    });
  });

  it("đọc lại rich text thành từng ký tự", () => {
    const value = valueOfChars("ab", toggleFormat(none(2), base, 1, 2, "underline"), base);
    const { text, chars } = charsOfValue(value, "");
    expect(text).toBe("ab");
    expect(chars).toHaveLength(2);
    expect(chars[1]).toMatchObject({ underline: true });
  });
});

describe("syncChars", () => {
  const bolded = toggleFormat(none(11), base, 6, 11, "bold"); // "Xin chào TG" -> phần sau dấu cách đậm

  it("gõ thêm chữ kế thừa định dạng của ký tự đứng trước con trỏ", () => {
    const next = syncChars("hello world", "hello worldX", bolded);
    expect(next).toHaveLength(12);
    expect(next[11]).toMatchObject({ bold: true });
  });

  it("gõ ở đoạn thường không làm đoạn đậm sau đó đổi", () => {
    const next = syncChars("hello world", "hellox world", bolded);
    expect(next[5]).toBeUndefined();
    expect(next[7]).toMatchObject({ bold: true });
  });

  it("xóa chữ cắt đúng phần định dạng", () => {
    const next = syncChars("hello world", "hello ", bolded);
    expect(next).toHaveLength(6);
    expect(next.every((font) => font === undefined)).toBe(true);
  });

  it("thay cả chữ thì theo font của ô; đổi hoa thường cùng độ dài thì giữ định dạng", () => {
    expect(syncChars("abc", "xyz1", toggleFormat(none(3), base, 0, 3, "bold")).every((font) => font === undefined)).toBe(true);
    expect(syncChars("hello world", "HELLO WORLD", bolded)).toBe(bolded);
  });
});

describe("expandToTokens", () => {
  it("bôi đen chạm một phần trường thì lấy trọn trường", () => {
    const text = "Họ tên: {{hoVaTen}} xong";
    expect(expandToTokens(text, 12, 14)).toEqual({ start: 8, end: 19 });
    expect(expandToTokens(text, 0, 3)).toEqual({ start: 0, end: 3 });
  });
});

describe("đổi định dạng cả ô khi ô đã có rich text", () => {
  const value = valueOfChars("ab cd", toggleFormat(none(5), base, 3, 5, "bold"), base);

  it("patchRuns áp font cho mọi đoạn", () => {
    const patched = patchRuns(value, { italic: true }) as { richText: { font: { italic?: boolean } }[] };
    expect(patched.richText.every((part) => part.font.italic === true)).toBe(true);
  });

  it("mapRunText đổi chữ từng đoạn mà giữ định dạng", () => {
    const upper = mapRunText(value, (text) => text.toUpperCase()) as { richText: { text: string; font: { bold?: boolean } }[] };
    expect(upper.richText.map((part) => part.text)).toEqual(["AB ", "CD"]);
    expect(upper.richText[1].font.bold).toBe(true);
  });

  it("clearFormat bỏ thuộc tính ở mọi ký tự", () => {
    const cleared = clearFormat(toggleFormat(none(3), base, 0, 3, "bold"), "bold");
    expect(cleared.every((font) => font === undefined)).toBe(true);
  });
});
