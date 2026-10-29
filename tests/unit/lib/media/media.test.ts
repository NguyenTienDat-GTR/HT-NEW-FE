import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImage, ImageValidationError } from "@/lib/media/compress-image";
import { mediaSrc } from "@/lib/media/media-url";
import { uploadMedia } from "@/lib/media/upload-media";

describe("mediaSrc", () => {
  it("prefixes backend media paths with the proxy path", () => {
    expect(mediaSrc("/api/media/abc/thumb?exp=1&sig=x")).toBe("/backend/api/media/abc/thumb?exp=1&sig=x");
  });

  it("keeps legacy data URLs and absolute URLs untouched", () => {
    expect(mediaSrc("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    expect(mediaSrc("https://example.com/a.png")).toBe("https://example.com/a.png");
  });

  it("returns undefined for empty values", () => {
    expect(mediaSrc(null)).toBeUndefined();
    expect(mediaSrc(undefined)).toBeUndefined();
    expect(mediaSrc("")).toBeUndefined();
  });
});

describe("compressImage validation", () => {
  it("rejects files that are not images", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    await expect(compressImage(file, "avatar")).rejects.toBeInstanceOf(ImageValidationError);
  });

  it("rejects oversized inputs before decoding", async () => {
    const big = new File([new Uint8Array(26 * 1024 * 1024)], "huge.png", { type: "image/png" });
    await expect(compressImage(big, "avatar")).rejects.toThrow(/quá lớn/);
  });
});

describe("uploadMedia", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not call the backend when the file is not an image", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    await expect(uploadMedia(file, "LEADER_AVATAR")).rejects.toBeInstanceOf(ImageValidationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
