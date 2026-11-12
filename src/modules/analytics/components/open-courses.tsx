"use client";

import { ArrowRight, CalendarBlank, CaretLeft, CaretRight, Clock, MapPin, UsersThree, WarningCircle } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn, viNumber } from "@/lib/utils";
import { SkeletonBlock } from "@/modules/analytics/components/section-card";
import { computeSliderView, MAX_DOTS, pageScrollLeft, SLIDER_GAP_PX, type SliderView } from "@/modules/analytics/components/open-courses-slider";
import { formatDateVi } from "@/modules/analytics/record-format";
import type { OpenCourse } from "@/modules/analytics/types";

/** Trang chi tiết khóa, mở sẵn tab đăng ký tham dự. */
export function courseRegistrationHref(courseCode: string) {
  return `/training/courses/${encodeURIComponent(courseCode)}?tab=registrations`;
}

export function deadlineText(hoursLeft?: number | null) {
  if (hoursLeft === null || hoursLeft === undefined) return "Không giới hạn hạn đăng ký";
  if (hoursLeft < 1) return "Còn dưới 1 giờ";
  if (hoursLeft < 24) return `Còn ${hoursLeft} giờ`;
  return `Còn ${Math.floor(hoursLeft / 24)} ngày`;
}

/**
 * Khóa đang mở đăng ký: khóa sắp hết hạn nổi màu cảnh báo (kèm biểu tượng và chữ, không chỉ màu); bấm vào để sang khóa đó và đăng ký.
 * Dùng chung cho giáo xứ, giáo hạt và giáo phận. Nhiều khóa thì trượt ngang theo trang thay vì xuống hàng, nên khung không cao thêm.
 */
export function OpenCourses({ courses, loading }: { courses?: OpenCourse[]; loading?: boolean }) {
  if (loading || !courses) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <SkeletonBlock className="h-[132px]" key={index} />
        ))}
      </div>
    );
  }
  if (!courses.length) {
    return (
      <div className="grid min-h-[132px] place-items-center rounded-lg border border-dashed border-border bg-surface-1 p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">Hiện chưa có khóa nào đang mở đăng ký</p>
          <p className="mt-1 text-[13px] text-muted">Khóa mới mở đăng ký sẽ xuất hiện ở đây.</p>
        </div>
      </div>
    );
  }
  return <CourseSlider courses={courses} />;
}

function CourseSlider({ courses }: { courses: OpenCourse[] }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [view, setView] = useState<SliderView>({ page: 0, pages: 1, perView: 1 });

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    const first = scroller?.firstElementChild as HTMLElement | null | undefined;
    if (!scroller || !first) return;
    const style = getComputedStyle(scroller);
    const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const next = computeSliderView({
      count: scroller.children.length,
      cardWidth: first.offsetWidth,
      gap: SLIDER_GAP_PX,
      viewportWidth: scroller.clientWidth - padding,
      scrollLeft: scroller.scrollLeft,
      maxScrollLeft: scroller.scrollWidth - scroller.clientWidth,
    });
    // Giữ nguyên state khi không đổi để việc cuộn không dựng lại cả danh sách.
    setView((current) => (current.page === next.page && current.pages === next.pages && current.perView === next.perView ? current : next));
  }, []);

  // Đo trước khi vẽ để điều khiển hiện đúng ngay lần đầu, không làm bố cục nhảy.
  useLayoutEffect(() => {
    measure();
  }, [measure, courses]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [measure]);

  const goTo = useCallback(
    (page: number) => {
      const scroller = scrollerRef.current;
      const first = scroller?.firstElementChild as HTMLElement | null | undefined;
      if (!scroller || !first) return;
      const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scroller.scrollTo({ left: pageScrollLeft(view, page, first.offsetWidth, SLIDER_GAP_PX), behavior: reduceMotion ? "auto" : "smooth" });
    },
    [view],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (view.pages <= 1) return;
    if (event.key === "ArrowLeft" && view.page > 0) {
      event.preventDefault();
      goTo(view.page - 1);
    } else if (event.key === "ArrowRight" && view.page < view.pages - 1) {
      event.preventDefault();
      goTo(view.page + 1);
    }
  };

  const paged = view.pages > 1;
  const firstShown = view.page * view.perView + 1;
  const lastShown = Math.min(courses.length, firstShown + view.perView - 1);

  return (
    <div aria-label="Khóa đang mở đăng ký" aria-roledescription="carousel" onKeyDown={onKeyDown} role="region">
      <div className="@container">
        {/* Khung cuộn có đệm trên, dưới và hai bên để thẻ nâng lên và đổ bóng khi rê chuột không bị cắt; margin âm trả lại đúng vị trí. */}
        <ul className="-mx-1 -my-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-1 px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" ref={scrollerRef}>
          {courses.map((course, index) => (
            <li
              className="min-w-0 shrink-0 basis-full snap-start @xl:basis-[calc((100%-0.75rem)/2)] @5xl:basis-[calc((100%-1.5rem)/3)]"
              key={course.courseCode}
            >
              <CourseCard course={course} index={index} />
            </li>
          ))}
        </ul>
      </div>
      {paged ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <SliderButton direction="prev" disabled={view.page <= 0} onClick={() => goTo(view.page - 1)} />
          {view.pages <= MAX_DOTS ? (
            <div aria-label="Chọn nhóm khóa" className="flex items-center" role="group">
              {Array.from({ length: view.pages }).map((_, index) => (
                <button
                  aria-current={index === view.page ? "true" : undefined}
                  aria-label={`Nhóm khóa ${index + 1} trên ${view.pages}`}
                  className="group/dot grid h-6 w-6 cursor-pointer place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  key={index}
                  onClick={() => goTo(index)}
                  type="button"
                >
                  <span className={cn("h-2 rounded-full transition-[width,background-color] duration-200", index === view.page ? "w-5 bg-primary" : "w-2 bg-border group-hover/dot:bg-muted")} />
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs font-semibold tabular-nums text-muted">
              {view.page + 1} / {view.pages}
            </span>
          )}
          <SliderButton direction="next" disabled={view.page >= view.pages - 1} onClick={() => goTo(view.page + 1)} />
          <span aria-live="polite" className="sr-only">
            Đang xem khóa {firstShown} đến {lastShown} trên {courses.length} khóa
          </span>
        </div>
      ) : null}
    </div>
  );
}

function SliderButton({ direction, disabled, onClick }: { direction: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const Icon = direction === "prev" ? CaretLeft : CaretRight;
  return (
    <button
      aria-label={direction === "prev" ? "Xem các khóa trước" : "Xem các khóa tiếp theo"}
      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-white text-foreground transition-colors hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" weight="bold" />
    </button>
  );
}

function CourseCard({ course, index }: { course: OpenCourse; index: number }) {
  const closing = course.urgency === "closing";
  return (
    <Link
      className={cn(
        "analytics-rise group relative block h-full overflow-hidden rounded-xl border bg-white p-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        closing ? "border-[var(--viz-warning)]/70" : "border-border hover:border-primary/30",
      )}
      href={courseRegistrationHref(course.courseCode) as Route}
      // Chỉ nối tiếp vài thẻ đầu: trượt tới thẻ ở xa thì không phải chờ hiệu ứng vào.
      style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", closing ? "bg-[var(--viz-warning)]" : "bg-[var(--viz-3)]")} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{course.courseName}</p>
          {course.courseType ? <p className="mt-0.5 truncate text-xs text-muted">{course.courseType}</p> : null}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
            closing ? "bg-[#fff4d6] text-[#8a5a00]" : "bg-[#e8f5e8] text-[var(--viz-delta-good)]",
          )}
        >
          {closing ? <WarningCircle className="h-3.5 w-3.5" weight="fill" /> : <Clock className="h-3.5 w-3.5" weight="bold" />}
          {closing ? "Gần hết hạn" : "Đang mở"} · {deadlineText(course.hoursLeft)}
        </span>
      </div>
      <dl className="mt-3 space-y-1 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <CalendarBlank className="h-3.5 w-3.5 shrink-0 text-muted" weight="bold" />
          <dt className="sr-only">Thời gian học</dt>
          <dd>
            {course.startDate ? formatDateVi(course.startDate) : "—"} – {course.endDate ? formatDateVi(course.endDate) : "—"}
          </dd>
        </div>
        {course.location ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" weight="bold" />
            <dt className="sr-only">Địa điểm</dt>
            <dd className="truncate">{course.location}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <UsersThree className="h-3.5 w-3.5 shrink-0 text-muted" weight="bold" />
          <dt className="sr-only">Đã đăng ký</dt>
          <dd>{viNumber.format(course.registeredLeaders)} huynh trưởng đã đăng ký</dd>
        </div>
      </dl>
      <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
        Đăng ký tham dự
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" weight="bold" />
      </span>
    </Link>
  );
}
