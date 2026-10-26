import { describe, expect, it, vi } from "vitest";
import { attendanceTokenFromScan, explainRejectedScan, isLegacyAttendanceToken } from "@/modules/course-participants/attendance-token";
import { categorizeIssue, groupIssues, issuesToCsv, summarizeInvitation } from "@/modules/course-participants/invitation-summary";
import { pollUntilDone } from "@/modules/course-participants/job-runner";
import {
  EMPTY_PARTICIPANT_QUERY,
  activeFilterCount,
  badgeCountFor,
  badgeExportBody,
  buildParticipantParams,
  invitationBody,
} from "@/modules/course-participants/participant-query";
import { classifyScan } from "@/modules/qr-scan/scan-payload";
import type { InvitationIssue, InvitationResult } from "@/modules/course-participants/types";

function result(overrides: Partial<InvitationResult> = {}): InvitationResult {
  return { total: 5, sent: 3, skippedAlreadySent: 0, failed: 2, includeQr: true, issues: [], ...overrides };
}

describe("attendanceTokenFromScan", () => {
  it("accepts a signed token that carries the course code", () => {
    expect(attendanceTokenFromScan("HTATT2.KH-2026-1.3f2a-uuid.abcDEF_123")).toBe("HTATT2.KH-2026-1.3f2a-uuid.abcDEF_123");
  });

  it("tolerates scanner whitespace and trailing newlines", () => {
    expect(attendanceTokenFromScan("  HTATT2.kh.id.sig \r\n")).toBe("HTATT2.kh.id.sig");
    expect(attendanceTokenFromScan("HTATT2.kh.id.sig\nextra line")).toBe("HTATT2.kh.id.sig");
  });

  it("rejects other QR contents", () => {
    expect(attendanceTokenFromScan("")).toBeNull();
    expect(attendanceTokenFromScan("   ")).toBeNull();
    expect(attendanceTokenFromScan("https://ht.example.com/certificates/GPPC-1")).toBeNull();
    expect(attendanceTokenFromScan("GPPC-HTI-2026-1")).toBeNull();
    expect(attendanceTokenFromScan("htatt2.kh.id.sig")).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(attendanceTokenFromScan("HTATT2.kh.id")).toBeNull();
    expect(attendanceTokenFromScan("HTATT2.kh..sig")).toBeNull();
    expect(attendanceTokenFromScan("HTATT2..id.sig")).toBeNull();
    expect(attendanceTokenFromScan("HTATT2.kh.id.")).toBeNull();
    expect(attendanceTokenFromScan("HTATT2.kh.id.sig.extra")).toBeNull();
    expect(attendanceTokenFromScan("HTATT2.kh.id with space.sig")).toBeNull();
    expect(attendanceTokenFromScan(`HTATT2.kh.id.${"a".repeat(300)}`)).toBeNull();
  });

  it("does not accept the old token without a course code", () => {
    expect(attendanceTokenFromScan("HTATT1.id.sig")).toBeNull();
    expect(isLegacyAttendanceToken(" HTATT1.id.sig\n")).toBe(true);
    expect(isLegacyAttendanceToken("HTATT2.kh.id.sig")).toBe(false);
  });
});

describe("explainRejectedScan", () => {
  it("recognises a certificate QR", () => {
    expect(explainRejectedScan("https://ht.example.com/certificates/GPPC-1")).toContain("mã QR của chứng nhận");
  });

  it("asks for a new code when the old format is scanned", () => {
    expect(explainRejectedScan("HTATT1.id.sig")).toContain("phiên bản cũ");
  });

  it("gives a generic hint for anything else", () => {
    expect(explainRejectedScan("hello")).toContain("không phải mã điểm danh");
  });
});

describe("classifyScan", () => {
  it("tells attendance codes, certificate links and plain certificate codes apart", () => {
    expect(classifyScan("HTATT2.kh.id.sig")).toEqual({ kind: "attendance", token: "HTATT2.kh.id.sig" });
    expect(classifyScan("https://ht.example.com/certificates/GPPC-HTI-2026-1")).toEqual({ kind: "certificate", code: "GPPC-HTI-2026-1" });
    expect(classifyScan("GPPC-HTI-2026-1")).toEqual({ kind: "certificate", code: "GPPC-HTI-2026-1" });
  });

  it("flags the old attendance format and never treats HTATT strings as certificates", () => {
    expect(classifyScan("HTATT1.id.sig")).toEqual({ kind: "legacy-attendance" });
    expect(classifyScan("HTATT2.broken")).toEqual({ kind: "unknown" });
  });

  it("rejects everything else", () => {
    expect(classifyScan("")).toEqual({ kind: "unknown" });
    expect(classifyScan("https://evil.example.com/login")).toEqual({ kind: "unknown" });
    expect(classifyScan("hello world")).toEqual({ kind: "unknown" });
  });
});

describe("categorizeIssue", () => {
  it("maps BE reasons to categories", () => {
    expect(categorizeIssue("Hồ sơ chưa có email")).toBe("NO_EMAIL");
    expect(categorizeIssue("Email không hợp lệ: abc")).toBe("BAD_EMAIL");
    expect(categorizeIssue("Hồ sơ không thuộc danh sách tham dự của khóa")).toBe("NOT_PARTICIPANT");
    expect(categorizeIssue("Không gửi được email: 550 mailbox unavailable")).toBe("SEND_FAILED");
    expect(categorizeIssue("Không soạn được email: lỗi")).toBe("SEND_FAILED");
    expect(categorizeIssue("điều gì đó khác")).toBe("OTHER");
    expect(categorizeIssue(null)).toBe("OTHER");
    expect(categorizeIssue(undefined)).toBe("OTHER");
  });
});

describe("groupIssues", () => {
  const issues: InvitationIssue[] = [
    { fullName: "A", reason: "Email không hợp lệ: x" },
    { fullName: "B", reason: "Hồ sơ chưa có email" },
    { fullName: "C", reason: "Hồ sơ chưa có email" },
    { fullName: "D", reason: "Không gửi được email: boom" },
  ];

  it("groups in a stable order and keeps every issue", () => {
    const groups = groupIssues(issues);
    expect(groups.map((group) => group.category)).toEqual(["NO_EMAIL", "BAD_EMAIL", "SEND_FAILED"]);
    expect(groups[0].issues.map((issue) => issue.fullName)).toEqual(["B", "C"]);
    expect(groups.reduce((sum, group) => sum + group.issues.length, 0)).toBe(4);
  });

  it("returns nothing for no issues", () => {
    expect(groupIssues([])).toEqual([]);
  });
});

describe("summarizeInvitation", () => {
  it("is a success when everything was sent", () => {
    const summary = summarizeInvitation(result({ total: 4, sent: 4, failed: 0 }));
    expect(summary.tone).toBe("success");
    expect(summary.headline).toBe("Đã gửi 4 email thông tin tham dự");
  });

  it("warns and lists the problem groups when some hồ sơ failed", () => {
    const summary = summarizeInvitation(result({
      issues: [{ reason: "Hồ sơ chưa có email" }, { reason: "Email không hợp lệ: x" }],
    }));
    expect(summary.tone).toBe("warning");
    expect(summary.headline).toBe("Đã gửi 3 email, 2 hồ sơ chưa gửi được");
    expect(summary.details).toEqual(["1 hồ sơ: chưa có email", "1 hồ sơ: email sai định dạng"]);
  });

  it("is a danger when nothing could be sent", () => {
    const summary = summarizeInvitation(result({ total: 2, sent: 0, failed: 2, issues: [{ reason: "Hồ sơ chưa có email" }, { reason: "Hồ sơ chưa có email" }] }));
    expect(summary.tone).toBe("danger");
    expect(summary.headline).toBe("Không gửi được email nào (2 hồ sơ lỗi)");
  });

  it("mentions skipped hồ sơ and handles the all-skipped case", () => {
    const partial = summarizeInvitation(result({ total: 5, sent: 2, skippedAlreadySent: 3, failed: 0 }));
    expect(partial.details).toContain("3 hồ sơ đã được gửi trước đó nên bỏ qua");
    const allSkipped = summarizeInvitation(result({ total: 3, sent: 0, skippedAlreadySent: 3, failed: 0 }));
    expect(allSkipped.tone).toBe("success");
    expect(allSkipped.headline).toContain("đã được gửi trước đó");
  });

  it("warns when there was nobody to send to", () => {
    const summary = summarizeInvitation(result({ total: 0, sent: 0, failed: 0 }));
    expect(summary.tone).toBe("warning");
    expect(summary.headline).toBe("Không có hồ sơ nào cần gửi");
  });
});

describe("issuesToCsv", () => {
  it("writes a BOM, header and escaped rows", () => {
    const csv = issuesToCsv([{ holyName: "Giuse", fullName: 'Nguyễn "Văn" A', email: "a@b.vn", reason: "Email không hợp lệ: a@b" }, { reason: "Hồ sơ chưa có email" }]);
    const lines = csv.split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines[0]).toBe('﻿"Tên thánh","Họ và tên","Email","Lý do"');
    expect(lines[1]).toBe('"Giuse","Nguyễn ""Văn"" A","a@b.vn","Email không hợp lệ: a@b"');
    expect(lines[2]).toBe('"","","","Hồ sơ chưa có email"');
  });

  it("only has the header when there are no issues", () => {
    expect(issuesToCsv([]).split("\r\n")).toHaveLength(1);
  });
});

describe("pollUntilDone", () => {
  const instantSleep = () => Promise.resolve();

  it("returns immediately when the first status is already final", async () => {
    const fetchStatus = vi.fn();
    const done = await pollUntilDone({ status: "DONE" }, fetchStatus, { sleep: instantSleep });
    expect(done.status).toBe("DONE");
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it("polls until the job leaves PENDING and reports each tick", async () => {
    const statuses = ["PENDING", "PENDING", "DONE"];
    const fetchStatus = vi.fn(async () => ({ status: statuses.shift() as string }));
    const ticks: string[] = [];
    const done = await pollUntilDone({ status: "PENDING" }, fetchStatus, { sleep: instantSleep, onTick: (value) => ticks.push(value.status) });
    expect(done.status).toBe("DONE");
    expect(fetchStatus).toHaveBeenCalledTimes(3);
    expect(ticks).toEqual(["PENDING", "PENDING", "DONE"]);
  });

  it("returns a FAILED job instead of throwing so callers can read its error", async () => {
    const done = await pollUntilDone({ status: "PENDING" }, async () => ({ status: "FAILED" }), { sleep: instantSleep });
    expect(done.status).toBe("FAILED");
  });

  it("gives up after the maximum number of attempts", async () => {
    const fetchStatus = vi.fn(async () => ({ status: "PENDING" }));
    await expect(pollUntilDone({ status: "PENDING" }, fetchStatus, { sleep: instantSleep, maxAttempts: 3 })).rejects.toThrow("Quá thời gian");
    expect(fetchStatus).toHaveBeenCalledTimes(3);
  });

  it("propagates network errors", async () => {
    await expect(pollUntilDone({ status: "PENDING" }, async () => { throw new Error("mất kết nối"); }, { sleep: instantSleep })).rejects.toThrow("mất kết nối");
  });

  it("waits the configured interval between polls", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    await pollUntilDone({ status: "PENDING" }, async () => ({ status: "DONE" }), { sleep, intervalMs: 250 });
    expect(sleep).toHaveBeenCalledWith(250);
  });
});

describe("participant query", () => {
  it("serialises only the active conditions", () => {
    expect(buildParticipantParams(EMPTY_PARTICIPANT_QUERY)).toBe("page=0&size=20");
    const params = new URLSearchParams(buildParticipantParams({ page: 2, size: 50, search: "  Nguyễn  ", team: "Đội 1", checkedIn: "false", invitation: "FAILED" }));
    expect(params.get("page")).toBe("2");
    expect(params.get("size")).toBe("50");
    expect(params.get("search")).toBe("Nguyễn");
    expect(params.get("team")).toBe("Đội 1");
    expect(params.get("checkedIn")).toBe("false");
    expect(params.get("invitation")).toBe("FAILED");
  });

  it("never sends a negative page", () => {
    expect(buildParticipantParams({ ...EMPTY_PARTICIPANT_QUERY, page: -4 })).toContain("page=0");
  });

  it("counts active filters without the search box", () => {
    expect(activeFilterCount(EMPTY_PARTICIPANT_QUERY)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_PARTICIPANT_QUERY, search: "x" })).toBe(0);
    expect(activeFilterCount({ ...EMPTY_PARTICIPANT_QUERY, team: "Đội 1", checkedIn: "true", invitation: "SENT" })).toBe(3);
  });
});

describe("request bodies", () => {
  it("badgeExportBody omits empty selections", () => {
    expect(badgeExportBody({ includeBack: true, flipEdge: "LONG" })).toEqual({ includeBack: true, flipEdge: "LONG" });
    expect(badgeExportBody({ includeBack: false, flipEdge: "SHORT", configId: "c1", participationIds: ["a", "b"], teamName: "  Đội 2 " })).toEqual({
      includeBack: false,
      flipEdge: "SHORT",
      configId: "c1",
      participationIds: ["a", "b"],
      teamName: "Đội 2",
    });
    expect(badgeExportBody({ includeBack: true, flipEdge: "LONG", participationIds: [], teamName: "   " })).toEqual({ includeBack: true, flipEdge: "LONG" });
  });

  it("invitationBody keeps the QR and resend flags", () => {
    expect(invitationBody({ includeQr: true, resend: false })).toEqual({ includeQr: true, resend: false });
    expect(invitationBody({ includeQr: false, resend: true, participationIds: ["p1"] })).toEqual({ includeQr: false, resend: true, participationIds: ["p1"] });
    expect(invitationBody({ includeQr: false, resend: false, participationIds: [] })).toEqual({ includeQr: false, resend: false });
  });

  it("badgeCountFor prefers the selection, then the team, then everyone", () => {
    expect(badgeCountFor({ selected: 3, total: 50, teamCount: 10 })).toBe(3);
    expect(badgeCountFor({ selected: 0, total: 50, teamCount: 10 })).toBe(10);
    expect(badgeCountFor({ selected: 0, total: 50 })).toBe(50);
  });
});
