/** Khoảng cách giữa các thẻ khóa trong slider (px), khớp class gap-3. */
export const SLIDER_GAP_PX = 12;

export type SliderView = {
  /** Trang đang xem (bắt đầu từ 0). */
  page: number;
  /** Tổng số trang; 1 nghĩa là mọi khóa đã nằm gọn trong khung, không cần điều khiển. */
  pages: number;
  /** Số thẻ nhìn thấy cùng lúc. */
  perView: number;
};

export type SliderMetrics = {
  /** Tổng số thẻ. */
  count: number;
  /** Chiều rộng một thẻ (px); 0 khi chưa đo được. */
  cardWidth: number;
  gap: number;
  /** Chiều rộng vùng nhìn thấy, đã trừ padding ngang của khung cuộn. */
  viewportWidth: number;
  scrollLeft: number;
  maxScrollLeft: number;
};

const UNMEASURED: SliderView = { page: 0, pages: 1, perView: 1 };

/** Số thẻ trên mỗi trang, tổng số trang và trang hiện tại, tính từ kích thước và vị trí cuộn của khung. */
export function computeSliderView(metrics: SliderMetrics): SliderView {
  const { count, cardWidth, gap, viewportWidth, scrollLeft, maxScrollLeft } = metrics;
  if (count <= 0 || cardWidth <= 0 || viewportWidth <= 0) return UNMEASURED;
  const step = cardWidth + gap;
  const perView = Math.max(1, Math.round((viewportWidth + gap) / step));
  const pages = Math.max(1, Math.ceil(count / perView));
  // Trang cuối có thể ít thẻ hơn nên bị chặn ở mép phải: coi chạm mép phải là trang cuối.
  const atEnd = maxScrollLeft > 0 && maxScrollLeft - scrollLeft <= 2;
  const page = atEnd ? pages - 1 : Math.min(pages - 1, Math.max(0, Math.round(scrollLeft / (step * perView))));
  return { page, pages, perView };
}

/** Vị trí cuộn (px) để trang `page` nằm sát mép trái; trình duyệt tự chặn ở mép phải với trang cuối. */
export function pageScrollLeft(view: Pick<SliderView, "pages" | "perView">, page: number, cardWidth: number, gap: number) {
  const target = Math.min(Math.max(page, 0), view.pages - 1);
  return target * view.perView * (cardWidth + gap);
}

/** Trang nhiều quá thì dấu chấm không vừa một hàng: chuyển sang số trang dạng chữ để khung không bị cao thêm. */
export const MAX_DOTS = 7;
