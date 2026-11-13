import { describe, expect, it } from "vitest";
import { canEditRow, canToggleRow } from "@/components/common/resource/resource-row-permissions";
import type { RouteConfig } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";
import { canActOnCourse, canRegisterCourse, canUseCourseTab, isDeaneryManagedCourse } from "@/modules/training-courses/course-permissions";

const deaneryId = "dea-1";
const dioceseId = "dio-1";
const user = (permissions: string[], extra: Partial<AuthUser> = {}): AuthUser => ({ username: "u", roles: [], permissions, deaneryId, dioceseId, ...extra }) as unknown as AuthUser;

// Admin giáo hạt kiêm admin giáo xứ: có quyền cấp giáo hạt và quyền gửi đăng ký của giáo xứ, không có quyền cấp giáo phận.
const deaneryAndParishAdmin = user([
  "training.course.read.deanery",
  "training.course.update.deanery",
  "training.course.toggle.deanery",
  "training.course.finish.deanery",
  "training.participation.lock.deanery",
  "training.participation.approve.deanery",
  "training.participation.score.deanery",
  "training.participation.submit.parish",
  "training.participation.read.parish",
]);
const dioceseAdmin = user(["training.course.update.diocese", "training.course.finish.diocese", "training.participation.lock.diocese"]);

const dioceseCourse = { managementUnitType: "DIOCESE", dioceseId, deaneryId: null };
const ownDeaneryCourse = { managementUnitType: "DEANERY", dioceseId: null, deaneryId };
const otherDeaneryCourse = { managementUnitType: "DEANERY", dioceseId: null, deaneryId: "dea-2" };

describe("canActOnCourse", () => {
  it("lets a deanery + parish admin manage only deanery courses of its own deanery", () => {
    for (const action of ["update", "toggle", "finish", "lockScore", "approve", "score"] as const) {
      expect(canActOnCourse(deaneryAndParishAdmin, ownDeaneryCourse, action)).toBe(true);
      expect(canActOnCourse(deaneryAndParishAdmin, otherDeaneryCourse, action)).toBe(false);
      expect(canActOnCourse(deaneryAndParishAdmin, dioceseCourse, action)).toBe(false);
    }
  });

  it("lets a diocese admin manage diocese courses but not deanery courses", () => {
    expect(canActOnCourse(dioceseAdmin, dioceseCourse, "finish")).toBe(true);
    expect(canActOnCourse(dioceseAdmin, dioceseCourse, "lockScore")).toBe(true);
    expect(canActOnCourse(dioceseAdmin, ownDeaneryCourse, "update")).toBe(false);
  });

  it("denies when there is no user or course", () => {
    expect(canActOnCourse(null, dioceseCourse, "update")).toBe(false);
    expect(canActOnCourse(dioceseAdmin, undefined, "update")).toBe(false);
  });

  it("falls back to the owning unit for past courses that have no course type", () => {
    expect(isDeaneryManagedCourse({ deaneryId })).toBe(true);
    expect(isDeaneryManagedCourse({ dioceseId })).toBe(false);
  });
});

describe("course list row actions", () => {
  const route = { kind: "courses" } as unknown as RouteConfig;

  it("hides edit and toggle on a diocese course for a deanery + parish admin", () => {
    expect(canEditRow(route, dioceseCourse, deaneryAndParishAdmin)).toBe(false);
    expect(canToggleRow(route, dioceseCourse, deaneryAndParishAdmin)).toBe(false);
    expect(canEditRow(route, ownDeaneryCourse, deaneryAndParishAdmin)).toBe(true);
    expect(canToggleRow(route, ownDeaneryCourse, deaneryAndParishAdmin)).toBe(true);
  });
});

describe("course tabs follow the course owner", () => {
  const tabs = ["registrations", "approvals", "participations", "teams", "attendance", "scores", "certificate-approvals"] as const;
  const visible = (u: AuthUser, course: Record<string, unknown>) => tabs.filter((tab) => canUseCourseTab(u, course, tab));
  const parishReader = user(["training.participation.read.parish", "training.participation.submit.parish"]);

  it("gives a deanery + parish admin every tab on its own deanery course", () => {
    const full = user([
      ...deaneryAndParishAdmin.permissions,
      "training.participation.read.deanery",
      "training.certificate.approve.deanery",
      "training.certificate.read.deanery",
    ]);
    expect(visible(full, ownDeaneryCourse)).toEqual([...tabs]);
  });

  it("keeps only registration and own-parish records on a diocese course for that account", () => {
    expect(visible(deaneryAndParishAdmin, dioceseCourse)).toEqual(["registrations", "participations"]);
  });

  it("hides the registration tab on a deanery course of another deanery unless the account reads its own parish records", () => {
    expect(canUseCourseTab(deaneryAndParishAdmin, otherDeaneryCourse, "approvals")).toBe(false);
    expect(canUseCourseTab(deaneryAndParishAdmin, otherDeaneryCourse, "teams")).toBe(false);
    expect(canRegisterCourse(deaneryAndParishAdmin, otherDeaneryCourse)).toBe(false);
  });

  it("shows the registration tab of a diocese course to a deanery account that can only read, never other deaneries' courses or a diocese admin on a deanery course", () => {
    const reader = user(["training.participation.read.deanery"]);
    expect(canUseCourseTab(reader, dioceseCourse, "registrations")).toBe(true);
    expect(canUseCourseTab(reader, otherDeaneryCourse, "registrations")).toBe(false);
    expect(canUseCourseTab(reader, { ...dioceseCourse, dioceseId: "dio-2" }, "registrations")).toBe(false);
    const dioceseReader = user(["training.participation.read.diocese"]);
    expect(canUseCourseTab(dioceseReader, ownDeaneryCourse, "registrations")).toBe(false);
  });

  it("lets a parish account register for a diocese course and read its own records, but not work the course", () => {
    expect(visible(parishReader, dioceseCourse)).toEqual(["registrations", "participations"]);
    expect(canRegisterCourse(parishReader, dioceseCourse)).toBe(true);
  });

  it("shows the diocese admin the working tabs of its own diocese course", () => {
    const admin = user(["training.participation.approve.diocese", "training.participation.score.diocese", "training.participation.read.diocese", "training.certificate.approve.diocese", "training.participation.submit.diocese"]);
    expect(visible(admin, dioceseCourse)).toEqual([...tabs]);
    expect(visible(admin, ownDeaneryCourse)).toEqual([]);
  });

  it("does not hide anything before the course data has loaded", () => {
    expect(visible(deaneryAndParishAdmin, undefined as unknown as Record<string, unknown>)).toEqual([...tabs]);
  });
});
