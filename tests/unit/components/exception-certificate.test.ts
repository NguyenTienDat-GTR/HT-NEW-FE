import { describe, expect, it } from "vitest";
import { canCreateExceptionCertificate } from "@/components/common/resource/exception-certificate-action";

const failing = { approvalStatus: "APPROVED", result: "UNCOMPLETED", totalScore: 4, certificateApprovalStatus: "NOT_REQUIRED", courseResultingLevel: "HT_I", courseFinished: false, coursePast: false };

describe("canCreateExceptionCertificate", () => {
  it("allows a graded failing participation of a course that grants a level", () => {
    expect(canCreateExceptionCertificate(failing)).toBe(true);
    expect(canCreateExceptionCertificate({ ...failing, certificateApprovalStatus: "REJECTED" })).toBe(true);
  });

  it("rejects passed, ungraded, finished, past, level-less or already certified participations", () => {
    expect(canCreateExceptionCertificate({ ...failing, result: "COMPLETED" })).toBe(false);
    expect(canCreateExceptionCertificate({ ...failing, totalScore: null })).toBe(false);
    expect(canCreateExceptionCertificate({ ...failing, courseFinished: true })).toBe(false);
    expect(canCreateExceptionCertificate({ ...failing, coursePast: true })).toBe(false);
    expect(canCreateExceptionCertificate({ ...failing, courseResultingLevel: "NONE" })).toBe(false);
    expect(canCreateExceptionCertificate({ ...failing, certificateApprovalStatus: "PENDING" })).toBe(false);
    expect(canCreateExceptionCertificate({ ...failing, certificateApprovalStatus: "APPROVED" })).toBe(false);
  });
});
