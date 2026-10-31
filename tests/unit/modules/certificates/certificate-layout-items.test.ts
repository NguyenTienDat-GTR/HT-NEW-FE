import { describe, expect, it } from "vitest";
import { DEFAULT_PHOTO_SIZE, DEFAULT_QR_SIZE } from "@/modules/certificates/components/certificate-design";
import { fieldItem, photoItem, qrItem, textItem } from "@/modules/certificates/certificate-layout-items";

describe("new layout items", () => {
  it("creates centered, black, non-styled field and text items", () => {
    expect(fieldItem("leaderFullName")).toEqual({
      type: "FIELD", fieldKey: "leaderFullName", x: 0.5, y: 0.5, fontSize: 0.04, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false,
    });
    expect(textItem()).toMatchObject({ type: "TEXT", text: "Văn bản", x: 0.5, y: 0.5 });
  });

  it("places QR bottom right and photo on the left with their default sizes", () => {
    expect(qrItem()).toMatchObject({ type: "QR", size: DEFAULT_QR_SIZE, x: 0.88, y: 0.82 });
    expect(photoItem()).toMatchObject({ type: "PHOTO", photoRatio: "4x6", size: DEFAULT_PHOTO_SIZE, x: 0.12, y: 0.3 });
  });

  it("returns a fresh object every time so edits never leak between items", () => {
    expect(textItem()).not.toBe(textItem());
  });
});
