import { describe, expect, it } from "vitest";
import { isCourseEnded, resolveOrganizingState, resolveRegistrationState } from "@/modules/training-courses/registration-state";

describe("course status resolution", () => {
  it("prefers the status stored by the backend", () => {
    expect(resolveRegistrationState({ registrationStatus: "CLOSED", registrationEndAt: "2999-01-01T00:00:00+07:00" })).toBe("CLOSED");
    expect(resolveOrganizingState({ organizingStatus: "ONGOING" })).toBe("ONGOING");
  });

  it("falls back to the time window when the backend status is missing", () => {
    const now = new Date("2026-10-19T12:00:00+07:00");
    expect(resolveRegistrationState({ registrationStartAt: "2026-10-20T00:00:00+07:00", registrationEndAt: "2026-10-25T00:00:00+07:00" }, now.getTime())).toBe("NOT_STARTED");
    expect(resolveRegistrationState({ registrationStartAt: "2026-10-01T00:00:00+07:00", registrationEndAt: "2026-10-18T00:00:00+07:00" }, now.getTime())).toBe("ENDED");
    expect(resolveOrganizingState({ startDate: "2026-10-19", endDate: "2026-10-21" }, now)).toBe("ONGOING");
    expect(resolveOrganizingState({ startDate: "2026-10-01", endDate: "2026-10-10" }, now)).toBe("ENDED");
    expect(resolveOrganizingState({ startDate: "2026-11-01", endDate: "2026-11-10" }, now)).toBe("UPCOMING");
  });
});

describe("registrationEnabled flag", () => {
  it("shows a course that does not open registration as DISABLED unless it has already ended", () => {
    expect(resolveRegistrationState({ registrationEnabled: false, registrationStatus: "CLOSED", organizingStatus: "UPCOMING" })).toBe("DISABLED");
    expect(resolveRegistrationState({ registrationEnabled: false, registrationStatus: "ENDED", organizingStatus: "ENDED" })).toBe("ENDED");
    expect(resolveRegistrationState({ registrationEnabled: true, registrationStatus: "OPEN", organizingStatus: "UPCOMING" })).toBe("OPEN");
  });
});

describe("started courses close registration", () => {
  it("shows ENDED for a course that already started even if the registration flag is on and the window is open", () => {
    const started = { registrationEnabled: true, registrationStatus: "OPEN", organizingStatus: "ONGOING", startDate: "2000-01-01", endDate: "2999-01-01" };
    expect(resolveRegistrationState(started)).toBe("ENDED");
    expect(resolveRegistrationState({ ...started, organizingStatus: "UPCOMING", startDate: "2999-01-01", endDate: "2999-02-01" })).toBe("OPEN");
  });
});

describe("isCourseEnded", () => {
  const now = new Date("2026-10-19T12:00:00+07:00");

  it("treats a manually finished course as ended even before its planned end date", () => {
    expect(isCourseEnded({ finishedAt: "2026-10-18T09:00:00+07:00", organizingStatus: "ONGOING", endDate: "2026-10-30" }, now)).toBe(true);
  });

  it("treats a course past its end date as ended even when the stored status is stale", () => {
    expect(isCourseEnded({ organizingStatus: "ONGOING", startDate: "2026-10-01", endDate: "2026-10-18" }, now)).toBe(true);
  });

  it("keeps upcoming and ongoing courses editable", () => {
    expect(isCourseEnded({ organizingStatus: "UPCOMING", startDate: "2026-10-25", endDate: "2026-10-27" }, now)).toBe(false);
    expect(isCourseEnded({ organizingStatus: "ONGOING", startDate: "2026-10-18", endDate: "2026-10-19" }, now)).toBe(false);
  });
});
