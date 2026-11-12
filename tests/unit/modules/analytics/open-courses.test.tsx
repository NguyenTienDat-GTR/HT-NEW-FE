import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courseRegistrationHref, OpenCourses } from "@/modules/analytics/components/open-courses";
import type { OpenCourse } from "@/modules/analytics/types";

function course(index: number, overrides: Partial<OpenCourse> = {}): OpenCourse {
  return { courseCode: `K${index}`, courseName: `Khóa số ${index}`, urgency: "open", registeredLeaders: index, hoursLeft: 100, ...overrides };
}

const original = {
  offsetWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth"),
  clientWidth: Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth"),
  scrollWidth: Object.getOwnPropertyDescriptor(Element.prototype, "scrollWidth"),
  scrollTo: (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo,
};

/** jsdom không có layout: giả lập khung rộng 612px (vừa hai thẻ 300px cách nhau 12px). */
function fakeLayout(courseCount: number) {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 300 });
  Object.defineProperty(Element.prototype, "clientWidth", { configurable: true, get: () => 612 });
  Object.defineProperty(Element.prototype, "scrollWidth", { configurable: true, get: () => courseCount * 300 + (courseCount - 1) * 12 });
  const scrollTo = vi.fn();
  (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo = scrollTo;
  return scrollTo;
}

afterEach(() => {
  for (const key of ["offsetWidth"] as const) {
    if (original[key]) Object.defineProperty(HTMLElement.prototype, key, original[key]);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
  }
  for (const key of ["clientWidth", "scrollWidth"] as const) {
    if (original[key]) Object.defineProperty(Element.prototype, key, original[key]);
    else delete (Element.prototype as unknown as Record<string, unknown>)[key];
  }
  (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo = original.scrollTo;
});

describe("OpenCourses", () => {
  it("links each course to its registration tab", () => {
    render(<OpenCourses courses={[course(1), course(2)]} />);

    expect(screen.getByRole("link", { name: /Khóa số 1/ })).toHaveAttribute("href", courseRegistrationHref("K1"));
    expect(screen.getByRole("link", { name: /Khóa số 2/ })).toHaveAttribute("href", "/training/courses/K2?tab=registrations");
  });

  it("shows an empty state instead of a slider when no course is open", () => {
    render(<OpenCourses courses={[]} />);

    expect(screen.getByText("Hiện chưa có khóa nào đang mở đăng ký")).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("marks a course that closes soon with a text label, not only a colour", () => {
    render(<OpenCourses courses={[course(1, { urgency: "closing", hoursLeft: 5 })]} />);

    expect(screen.getByText(/Gần hết hạn · Còn 5 giờ/)).toBeInTheDocument();
  });

  it("renders every course in one row with no paging controls when they all fit", () => {
    fakeLayout(2);
    render(<OpenCourses courses={[course(1), course(2)]} />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Xem các khóa tiếp theo" })).not.toBeInTheDocument();
  });

  describe("with more courses than fit", () => {
    let scrollTo: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      scrollTo = fakeLayout(5);
    });

    it("keeps all courses in a single scrollable row and shows one dot per page", () => {
      render(<OpenCourses courses={[1, 2, 3, 4, 5].map((index) => course(index))} />);

      expect(screen.getAllByRole("link")).toHaveLength(5);
      expect(screen.getAllByRole("listitem")).toHaveLength(5);
      expect(screen.getAllByRole("button", { name: /Nhóm khóa \d trên 3/ })).toHaveLength(3);
      expect(screen.getByRole("button", { name: "Nhóm khóa 1 trên 3" })).toHaveAttribute("aria-current", "true");
    });

    it("starts on the first page with the previous button disabled", () => {
      render(<OpenCourses courses={[1, 2, 3, 4, 5].map((index) => course(index))} />);

      expect(screen.getByRole("button", { name: "Xem các khóa trước" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Xem các khóa tiếp theo" })).toBeEnabled();
    });

    it("scrolls one page of cards when the next button is pressed", () => {
      render(<OpenCourses courses={[1, 2, 3, 4, 5].map((index) => course(index))} />);

      fireEvent.click(screen.getByRole("button", { name: "Xem các khóa tiếp theo" }));

      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 2 * (300 + 12) }));
    });

    it("jumps to the page picked from the dots", () => {
      render(<OpenCourses courses={[1, 2, 3, 4, 5].map((index) => course(index))} />);

      fireEvent.click(screen.getByRole("button", { name: "Nhóm khóa 3 trên 3" }));

      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 4 * (300 + 12) }));
    });

    it("supports the arrow keys on the carousel", () => {
      render(<OpenCourses courses={[1, 2, 3, 4, 5].map((index) => course(index))} />);

      fireEvent.keyDown(screen.getByRole("region", { name: "Khóa đang mở đăng ký" }), { key: "ArrowRight" });

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });
  });
});
