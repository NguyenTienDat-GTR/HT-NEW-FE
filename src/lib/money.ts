// Tiền Việt Nam đồng (số nguyên): định dạng 150.000, đọc bằng chữ và đọc số từ ô nhập.

// Lệ phí mỗi người tối đa, khớp ràng buộc phía BE (999.999.999 đồng).
export const MAX_FEE_AMOUNT = 999_999_999;

const NUMBER_FORMAT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** 150000 -> "150.000" (không kèm đơn vị). */
export function formatVndNumber(amount: number): string {
  return NUMBER_FORMAT.format(Math.trunc(amount));
}

/** 150000 -> "150.000 ₫". */
export function formatVnd(amount: number): string {
  return `${formatVndNumber(amount)} ₫`;
}

/** Chỉ giữ chữ số của chuỗi người dùng gõ / dán ("150.000 ₫" -> "150000"), bỏ số 0 đứng đầu, tối đa `maxDigits` chữ số. */
export function digitsOnly(text: string, maxDigits = 10): string {
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.slice(0, maxDigits);
}

/** Số tiền từ chuỗi chữ số; rỗng thì trả về chuỗi rỗng để ô nhập trống không bị coi là 0. */
export function amountFromDigits(digits: string): number | "" {
  return digits === "" ? "" : Number(digits);
}

const DIGIT_WORDS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const GROUP_UNITS = ["", "nghìn", "triệu", "tỷ"];

// Đọc một nhóm ba chữ số. `full` = nhóm không đứng đầu: đọc cả "không trăm" và "lẻ".
function readTriple(value: number, full: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const units = value % 10;
  const parts: string[] = [];
  if (hundreds > 0 || full) parts.push(`${DIGIT_WORDS[hundreds]} trăm`);
  if (tens === 0) {
    if (units > 0) parts.push(hundreds > 0 || full ? `lẻ ${DIGIT_WORDS[units]}` : DIGIT_WORDS[units]);
  } else if (tens === 1) {
    parts.push(units === 0 ? "mười" : units === 5 ? "mười lăm" : `mười ${DIGIT_WORDS[units]}`);
  } else {
    const tail = units === 0 ? "" : units === 1 ? " mốt" : units === 4 ? " tư" : units === 5 ? " lăm" : ` ${DIGIT_WORDS[units]}`;
    parts.push(`${DIGIT_WORDS[tens]} mươi${tail}`);
  }
  return parts.join(" ");
}

/** 150000 -> "Một trăm năm mươi nghìn đồng". Số âm, không nguyên hoặc quá lớn (≥ 1.000 tỷ) trả về chuỗi rỗng. */
export function vndToWords(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount >= 1_000_000_000_000) return "";
  if (amount === 0) return "Không đồng";
  const groups: number[] = [];
  for (let rest = amount; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);
  const words: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (group === 0) continue;
    const isLeading = words.length === 0;
    words.push(`${readTriple(group, !isLeading)}${GROUP_UNITS[index] ? ` ${GROUP_UNITS[index]}` : ""}`);
  }
  const sentence = `${words.join(" ")} đồng`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
