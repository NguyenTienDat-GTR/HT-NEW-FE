import { describe, expect, it } from "vitest";
import { amountFromDigits, digitsOnly, formatVnd, formatVndNumber, vndToWords } from "@/lib/money";

describe("định dạng tiền VND", () => {
  it("nhóm hàng nghìn bằng dấu chấm", () => {
    expect(formatVndNumber(150000)).toBe("150.000");
    expect(formatVndNumber(1250000)).toBe("1.250.000");
    expect(formatVndNumber(999)).toBe("999");
    expect(formatVnd(150000)).toBe("150.000 ₫");
  });

  it("chỉ giữ chữ số, bỏ số 0 đứng đầu và cắt quá độ dài", () => {
    expect(digitsOnly("150.000 ₫")).toBe("150000");
    expect(digitsOnly("abc")).toBe("");
    expect(digitsOnly("000150")).toBe("150");
    expect(digitsOnly("0")).toBe("0");
    expect(digitsOnly("123456789012345")).toBe("1234567890");
  });

  it("ô trống không bị coi là 0", () => {
    expect(amountFromDigits("")).toBe("");
    expect(amountFromDigits("0")).toBe(0);
    expect(amountFromDigits("150000")).toBe(150000);
  });
});

describe("đọc số tiền bằng chữ", () => {
  it.each([
    [0, "Không đồng"],
    [1, "Một đồng"],
    [5, "Năm đồng"],
    [10, "Mười đồng"],
    [15, "Mười lăm đồng"],
    [21, "Hai mươi mốt đồng"],
    [24, "Hai mươi tư đồng"],
    [25, "Hai mươi lăm đồng"],
    [105, "Một trăm lẻ năm đồng"],
    [110, "Một trăm mười đồng"],
    [1000, "Một nghìn đồng"],
    [1005, "Một nghìn không trăm lẻ năm đồng"],
    [15000, "Mười lăm nghìn đồng"],
    [50000, "Năm mươi nghìn đồng"],
    [150000, "Một trăm năm mươi nghìn đồng"],
    [200000, "Hai trăm nghìn đồng"],
    [1000000, "Một triệu đồng"],
    [1250000, "Một triệu hai trăm năm mươi nghìn đồng"],
    [2005000, "Hai triệu không trăm lẻ năm nghìn đồng"],
    [10500000, "Mười triệu năm trăm nghìn đồng"],
    [999999999, "Chín trăm chín mươi chín triệu chín trăm chín mươi chín nghìn chín trăm chín mươi chín đồng"],
    [1000000000, "Một tỷ đồng"],
    [1001000000, "Một tỷ không trăm lẻ một triệu đồng"],
  ])("%i -> %s", (amount, words) => {
    expect(vndToWords(amount)).toBe(words);
  });

  it("không đọc số âm, số lẻ hay quá lớn", () => {
    expect(vndToWords(-1)).toBe("");
    expect(vndToWords(1.5)).toBe("");
    expect(vndToWords(1_000_000_000_000)).toBe("");
  });
});
