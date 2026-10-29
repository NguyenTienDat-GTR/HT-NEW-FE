import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildAvatarZip, isImageEntry, readEntry, type AvatarItem } from "@/lib/media/prepare-avatar-zip";

const item = (entryName: string, removed = false): AvatarItem => ({ entryName, status: "ok", bytes: strToU8(entryName), previewUrl: "", removed });

describe("isImageEntry", () => {
  it("nhận ảnh JPG, PNG, WebP không phân biệt hoa thường", () => {
    expect(isImageEntry("a.jpg")).toBe(true);
    expect(isImageEntry("thu-muc/B.JPEG")).toBe(true);
    expect(isImageEntry("c.png")).toBe(true);
    expect(isImageEntry("d.webp")).toBe(true);
  });

  it("bỏ thư mục, file ẩn, __MACOSX và tệp không phải ảnh", () => {
    expect(isImageEntry("thu-muc/")).toBe(false);
    expect(isImageEntry(".anh.jpg")).toBe(false);
    expect(isImageEntry("__MACOSX/a.jpg")).toBe(false);
    expect(isImageEntry("x/__MACOSX/a.jpg")).toBe(false);
    expect(isImageEntry("ghi-chu.txt")).toBe(false);
    expect(isImageEntry("a.heic")).toBe(false);
  });
});

describe("buildAvatarZip", () => {
  it("giữ nguyên tên entry và bỏ ảnh đã xóa", async () => {
    const zip = buildAvatarZip([item("0901234567.jpg"), item("thu-muc/a@b.com.png"), item("bo.jpg", true)]);
    expect(zip).not.toBeNull();
    const source = new Uint8Array(await zip!.arrayBuffer());
    expect(new TextDecoder().decode(readEntry(source, "0901234567.jpg"))).toBe("0901234567.jpg");
    expect(new TextDecoder().decode(readEntry(source, "thu-muc/a@b.com.png"))).toBe("thu-muc/a@b.com.png");
    expect(() => readEntry(source, "bo.jpg")).toThrow();
  });

  it("trả null khi không còn ảnh nào", () => {
    expect(buildAvatarZip([item("a.jpg", true)])).toBeNull();
    expect(buildAvatarZip([])).toBeNull();
  });
});

describe("readEntry", () => {
  it("đọc đúng entry theo tên", () => {
    const source = zipSync({ "a.jpg": strToU8("aaa"), "b.jpg": strToU8("bbb") });
    expect(new TextDecoder().decode(readEntry(source, "b.jpg"))).toBe("bbb");
  });
});
