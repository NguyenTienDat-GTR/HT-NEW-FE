import { describe, expect, it } from "vitest";
import { endNotBeforeStart, registrationNotAfterStart } from "@/modules/training-courses/form-specs";
import {
  courseAttendanceOpensAtMs,
  formatCourseMoment,
  isCourseEnded,
  isCourseWithinDates,
  resolveOrganizingState,
} from "@/modules/training-courses/registration-state";

// Giờ Việt Nam (UTC+7) → Date
const vn = (iso: string) => new Date(`${iso}:00+07:00`);

const course = { startDate: "2026-12-10", endDate: "2026-12-12", startTime: "08:00", endTime: "17:30" };

describe("khóa huấn luyện có giờ bắt đầu / kết thúc", () => {
  it("tính trạng thái tổ chức theo giờ", () => {
    expect(resolveOrganizingState(course, vn("2026-12-10T07:59"))).toBe("UPCOMING");
    expect(resolveOrganizingState(course, vn("2026-12-10T08:00"))).toBe("ONGOING");
    expect(resolveOrganizingState(course, vn("2026-12-12T17:30"))).toBe("ONGOING");
    expect(resolveOrganizingState(course, vn("2026-12-12T17:31"))).toBe("ENDED");
    expect(isCourseEnded(course, vn("2026-12-12T17:31"))).toBe(true);
    expect(isCourseWithinDates(course, vn("2026-12-10T07:59"))).toBe(false);
    expect(isCourseWithinDates(course, vn("2026-12-11T00:00"))).toBe(true);
  });

  it("khóa cũ chưa có giờ vẫn tính theo cả ngày", () => {
    const legacy = { startDate: "2026-12-10", endDate: "2026-12-12" };
    expect(resolveOrganizingState(legacy, vn("2026-12-10T00:00"))).toBe("ONGOING");
    expect(resolveOrganizingState(legacy, vn("2026-12-12T23:59"))).toBe("ONGOING");
    expect(resolveOrganizingState(legacy, vn("2026-12-13T00:00"))).toBe("ENDED");
  });

  it("điểm danh mở sớm hơn giờ bắt đầu 2 tiếng", () => {
    expect(courseAttendanceOpensAtMs(course)).toBe(vn("2026-12-10T06:00").getTime());
    expect(courseAttendanceOpensAtMs({})).toBeUndefined();
  });

  it("hiển thị giờ kèm ngày, khóa quá khứ chỉ hiện ngày", () => {
    expect(formatCourseMoment(course, "start")).toBe("08:00 10-12-2026");
    expect(formatCourseMoment({ ...course, pastCourse: true }, "end")).toBe("12-12-2026");
    expect(formatCourseMoment({}, "start")).toBeNull();
  });

  it("thời gian đăng ký không được sau giờ bắt đầu", () => {
    const values = { startDate: "2026-12-10", startTime: "08:00" };
    expect(registrationNotAfterStart("2026-12-10T07:00", values)).toBeUndefined();
    expect(registrationNotAfterStart("2026-12-10T09:00", values)).toBeDefined();
    expect(registrationNotAfterStart("2026-12-10T00:30:00Z", values)).toBeUndefined();
  });

  it("giờ kết thúc phải sau giờ bắt đầu", () => {
    expect(endNotBeforeStart("08:00", { startDate: "2026-12-10", startTime: "08:00", endDate: "2026-12-10", endTime: "08:00" })).toBeDefined();
    expect(endNotBeforeStart("17:00", { startDate: "2026-12-10", startTime: "08:00", endDate: "2026-12-10", endTime: "17:00" })).toBeUndefined();
    expect(endNotBeforeStart("07:00", { startDate: "2026-12-10", startTime: "08:00", endDate: "2026-12-11", endTime: "07:00" })).toBeUndefined();
  });
});
