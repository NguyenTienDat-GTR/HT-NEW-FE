import { normalizeItem, type ConfigScopeLevel, type LayoutItem } from "@/modules/certificates/components/certificate-design";
import {
  DEFAULT_CARD,
  MAX_CARD_MM,
  MAX_GAP_MM,
  MAX_MARGIN_MM,
  MIN_CARD_MM,
  computeGrid,
  formatMm,
  isKnownPaper,
  orientCard,
  paperMm,
  type Grid,
  type Orientation,
} from "./badge-sheet";

export const MAX_NAME_LENGTH = 200;
export const MAX_LAYOUT_ITEMS = 100;

export type BadgeConfig = {
  id: string;
  name: string;
  isDefault: boolean;
  scopeLevel: ConfigScopeLevel;
  editable: boolean;
  paperSize?: string;
  paperOrientation?: Orientation;
  cardWidthMm?: number;
  cardHeightMm?: number;
  cardOrientation?: Orientation;
  marginMm?: number;
  gapMm?: number;
  cropMarks?: boolean;
  hasBack?: boolean;
  columns?: number;
  rows?: number;
  cardsPerPage?: number;
  frontBackground?: string | null;
  backBackground?: string | null;
  frontLayout?: LayoutItem[] | null;
  backLayout?: LayoutItem[] | null;
  updatedAt?: string | null;
};

export type BadgeSide = "front" | "back";

export type BadgeForm = {
  name: string;
  paperSize: string;
  paperOrientation: Orientation;
  cardWidthMm: number;
  cardHeightMm: number;
  cardOrientation: Orientation;
  marginMm: number;
  gapMm: number;
  cropMarks: boolean;
  hasBack: boolean;
  frontBackground: string;
  backBackground: string;
  frontLayout: LayoutItem[];
  backLayout: LayoutItem[];
};

export function blankBadgeForm(): BadgeForm {
  return {
    name: "",
    paperSize: "A4",
    paperOrientation: "PORTRAIT",
    cardWidthMm: DEFAULT_CARD.widthMm,
    cardHeightMm: DEFAULT_CARD.heightMm,
    cardOrientation: "LANDSCAPE",
    marginMm: DEFAULT_CARD.marginMm,
    gapMm: DEFAULT_CARD.gapMm,
    cropMarks: true,
    hasBack: false,
    frontBackground: "",
    backBackground: "",
    frontLayout: [],
    backLayout: [],
  };
}

export function formFromBadgeConfig(config: BadgeConfig): BadgeForm {
  const blank = blankBadgeForm();
  return {
    name: config.name,
    paperSize: config.paperSize ?? blank.paperSize,
    paperOrientation: config.paperOrientation === "LANDSCAPE" ? "LANDSCAPE" : "PORTRAIT",
    cardWidthMm: config.cardWidthMm ?? blank.cardWidthMm,
    cardHeightMm: config.cardHeightMm ?? blank.cardHeightMm,
    cardOrientation: config.cardOrientation === "PORTRAIT" ? "PORTRAIT" : "LANDSCAPE",
    marginMm: config.marginMm ?? blank.marginMm,
    gapMm: config.gapMm ?? blank.gapMm,
    cropMarks: config.cropMarks !== false,
    hasBack: Boolean(config.hasBack),
    frontBackground: config.frontBackground ?? "",
    backBackground: config.backBackground ?? "",
    frontLayout: (config.frontLayout ?? []).map(normalizeItem),
    backLayout: (config.backLayout ?? []).map(normalizeItem),
  };
}

export function isSameBadgeForm(a: BadgeForm, b: BadgeForm) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Nội dung gửi lên BE (khớp BadgeConfigUpsertRequest). Không có mặt sau thì không gửi nền / bố cục mặt sau.
export function badgePayload(form: BadgeForm) {
  return {
    name: form.name.trim(),
    paperSize: form.paperSize,
    paperOrientation: form.paperOrientation,
    cardWidthMm: form.cardWidthMm,
    cardHeightMm: form.cardHeightMm,
    cardOrientation: form.cardOrientation,
    marginMm: form.marginMm,
    gapMm: form.gapMm,
    cropMarks: form.cropMarks,
    hasBack: form.hasBack,
    frontBackground: form.frontBackground || null,
    backBackground: form.hasBack ? form.backBackground || null : null,
    frontLayout: form.frontLayout,
    backLayout: form.hasBack ? form.backLayout : [],
  };
}

export function gridOfForm(form: BadgeForm): Grid | null {
  const [paperW, paperH] = paperMm(form.paperSize, form.paperOrientation);
  const card = orientCard(form.cardWidthMm, form.cardHeightMm, form.cardOrientation);
  return computeGrid(paperW, paperH, card.widthMm, card.heightMm, form.marginMm, form.gapMm);
}

// Tỉ lệ rộng / cao của thẻ để dựng khung xem trước (đã áp hướng thẻ).
export function cardAspect(form: Pick<BadgeForm, "cardWidthMm" | "cardHeightMm" | "cardOrientation">) {
  const card = orientCard(form.cardWidthMm, form.cardHeightMm, form.cardOrientation);
  return card.widthMm / card.heightMm;
}

function outOfRange(value: number, min: number, max: number) {
  return !Number.isFinite(value) || value < min || value > max;
}

// Báo lỗi sớm giống kiểm tra ở BE; trả về danh sách thông báo tiếng Việt (rỗng = hợp lệ).
export function validateBadgeForm(form: BadgeForm): string[] {
  const errors: string[] = [];
  if (form.name.length > MAX_NAME_LENGTH) errors.push(`Tên tối đa ${MAX_NAME_LENGTH} ký tự.`);
  if (!isKnownPaper(form.paperSize)) errors.push("Khổ giấy không hợp lệ.");
  if (outOfRange(form.cardWidthMm, MIN_CARD_MM, MAX_CARD_MM)) errors.push(`Chiều rộng thẻ phải từ ${MIN_CARD_MM} đến ${MAX_CARD_MM} mm.`);
  if (outOfRange(form.cardHeightMm, MIN_CARD_MM, MAX_CARD_MM)) errors.push(`Chiều cao thẻ phải từ ${MIN_CARD_MM} đến ${MAX_CARD_MM} mm.`);
  if (outOfRange(form.marginMm, 0, MAX_MARGIN_MM)) errors.push(`Lề giấy phải từ 0 đến ${MAX_MARGIN_MM} mm.`);
  if (outOfRange(form.gapMm, 0, MAX_GAP_MM)) errors.push(`Khoảng cách giữa các thẻ phải từ 0 đến ${MAX_GAP_MM} mm.`);
  if (errors.length === 0 && !gridOfForm(form)) {
    const card = orientCard(form.cardWidthMm, form.cardHeightMm, form.cardOrientation);
    errors.push(
      `Thẻ ${formatMm(card.widthMm)} × ${formatMm(card.heightMm)} mm lớn hơn vùng in của khổ ${form.paperSize} (lề ${formatMm(form.marginMm)} mm). Hãy giảm kích thước thẻ, giảm lề hoặc chọn khổ giấy lớn hơn.`,
    );
  }
  if (form.frontLayout.length > MAX_LAYOUT_ITEMS) errors.push(`Mặt trước tối đa ${MAX_LAYOUT_ITEMS} phần tử.`);
  if (form.hasBack && form.backLayout.length > MAX_LAYOUT_ITEMS) errors.push(`Mặt sau tối đa ${MAX_LAYOUT_ITEMS} phần tử.`);
  return errors;
}

// Giá trị mẫu của trường thẻ để xem trước.
export function sampleBadgeValue(key: string | undefined, fallback: string): string {
  switch (key) {
    case "holyName":
      return "Giuse";
    case "leaderName":
      return "Nguyễn Văn An";
    case "leaderFullName":
      return "Giuse Nguyễn Văn An";
    case "leaderParishName":
      return "Giáo xứ Thượng Phúc";
    case "leaderDeaneryName":
      return "Giáo hạt Thủ Dầu Một";
    case "leaderDioceseName":
      return "Phú Cường";
    case "teamName":
      return "Đội 3";
    case "courseName":
      return "Sa mạc huấn luyện Dự trưởng";
    case "courseCode":
      return "KH-2026-01";
    case "hostYear":
      return "2026";
    case "courseStartDate":
      return "15/07/2026";
    case "courseEndDate":
      return "20/07/2026";
    case "coursePeriod":
      return "từ 15/07/2026 đến 20/07/2026";
    case "courseLocation":
      return "Nhà thờ Chánh Tòa";
    default:
      return fallback;
  }
}
