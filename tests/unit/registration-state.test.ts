import { describe, expect, it } from "vitest";
import { resolveOrganizingState, resolveRegistrationState } from "@/modules/training-courses/registration-state";

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
