import { describe, expect, it } from "vitest";
import { formatVietnamDate, formatVietnamDateTime, formatVietnamDateValue } from "@/lib/date-format";

describe("Vietnam date formatting", () => {
  it("formats date-only values as DD-MM-YYYY without timezone shifting", () => {
    expect(formatVietnamDate("2021-07-03")).toBe("03-07-2021");
    expect(formatVietnamDateValue("1995-06-15")).toBe("15-06-1995");
  });

  it("formats zoned date-time values in Vietnam time", () => {
    expect(formatVietnamDateTime("2021-07-03T01:02:03Z")).toBe("08:02:03 03-07-2021");
    expect(formatVietnamDateValue("2021-07-03T01:02:03+00:00")).toBe("08:02:03 03-07-2021");
  });

  it("treats timezone-less backend date-time values as Vietnam local time", () => {
    expect(formatVietnamDateTime("2021-07-03T01:02:03")).toBe("01:02:03 03-07-2021");
  });
});
