import { describe, expect, it } from "vitest";
import { computeSliderView, pageScrollLeft } from "@/modules/analytics/components/open-courses-slider";

const GAP = 12;
const CARD = 300;
const STEP = CARD + GAP;

/** Khung nhìn vừa đúng `perView` thẻ; `count` thẻ thì vùng cuộn dài count * CARD + (count - 1) * GAP. */
function metrics(count: number, perView: number, scrollLeft = 0) {
  const viewportWidth = perView * CARD + (perView - 1) * GAP;
  const contentWidth = count * CARD + (count - 1) * GAP;
  return { count, cardWidth: CARD, gap: GAP, viewportWidth, scrollLeft, maxScrollLeft: Math.max(0, contentWidth - viewportWidth) };
}

describe("computeSliderView", () => {
  it("needs a single page when every course fits in the viewport", () => {
    expect(computeSliderView(metrics(2, 2))).toEqual({ page: 0, pages: 1, perView: 2 });
    expect(computeSliderView(metrics(1, 3))).toEqual({ page: 0, pages: 1, perView: 3 });
  });

  it("splits the courses into pages of perView cards", () => {
    expect(computeSliderView(metrics(5, 2))).toEqual({ page: 0, pages: 3, perView: 2 });
    expect(computeSliderView(metrics(9, 3))).toEqual({ page: 0, pages: 3, perView: 3 });
    expect(computeSliderView(metrics(4, 1))).toEqual({ page: 0, pages: 4, perView: 1 });
  });

  it("follows the scroll position page by page", () => {
    expect(computeSliderView(metrics(6, 2, 2 * STEP)).page).toBe(1);
    expect(computeSliderView(metrics(6, 2, 4 * STEP)).page).toBe(2);
  });

  it("treats reaching the right edge as the last page even when that page is partly filled", () => {
    // 5 thẻ, 2 thẻ mỗi trang: trang cuối chỉ còn 1 thẻ mới nên bị chặn ở mép phải (cuộn tối đa 3 bước).
    const view = computeSliderView(metrics(5, 2, 3 * STEP));
    expect(view).toEqual({ page: 2, pages: 3, perView: 2 });
  });

  it("returns a harmless single page before the layout is measured", () => {
    expect(computeSliderView({ count: 5, cardWidth: 0, gap: GAP, viewportWidth: 0, scrollLeft: 0, maxScrollLeft: 0 })).toEqual({ page: 0, pages: 1, perView: 1 });
    expect(computeSliderView({ count: 0, cardWidth: CARD, gap: GAP, viewportWidth: 600, scrollLeft: 0, maxScrollLeft: 0 }).pages).toBe(1);
  });
});

describe("pageScrollLeft", () => {
  const view = { pages: 3, perView: 2 };

  it("moves by a whole page of cards", () => {
    expect(pageScrollLeft(view, 0, CARD, GAP)).toBe(0);
    expect(pageScrollLeft(view, 1, CARD, GAP)).toBe(2 * STEP);
    expect(pageScrollLeft(view, 2, CARD, GAP)).toBe(4 * STEP);
  });

  it("keeps the target inside the existing pages", () => {
    expect(pageScrollLeft(view, -1, CARD, GAP)).toBe(0);
    expect(pageScrollLeft(view, 9, CARD, GAP)).toBe(4 * STEP);
  });
});
