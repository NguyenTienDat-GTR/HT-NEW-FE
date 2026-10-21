import { describe, expect, it } from "vitest";
import { certificateCodeFromQr, certificateDetailHref } from "@/modules/certificates/scan-utils";

describe("certificateCodeFromQr", () => {
  it("returns plain certificate codes", () => {
    expect(certificateCodeFromQr(" GPPC-HTI-2026-1 ")).toBe("GPPC-HTI-2026-1");
  });
  it("takes the last path segment of a URL", () => {
    expect(certificateCodeFromQr("https://example.com/certificates/GPPC-HTI-2026-1")).toBe("GPPC-HTI-2026-1");
  });
  it("accepts QR links and rejects other URLs", () => {
    expect(certificateCodeFromQr("https://ht.example.com/certificates/GPPC-X-1")).toBe("GPPC-X-1");
    expect(certificateCodeFromQr("https://evil.example.com/login")).toBeNull();
    expect(certificateCodeFromQr("https://example.com/certificates")).toBeNull();
  });
  it("rejects empty or multi-word text", () => {
    expect(certificateCodeFromQr("")).toBeNull();
    expect(certificateCodeFromQr("hello world")).toBeNull();
    expect(certificateCodeFromQr("a\b")).toBeNull();
  });
  it("builds the detail href", () => {
    expect(certificateDetailHref("GPPC-HTI-2026-1")).toBe("/certificates/GPPC-HTI-2026-1");
  });
});
