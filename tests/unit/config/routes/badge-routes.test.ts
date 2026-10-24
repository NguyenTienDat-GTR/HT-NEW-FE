import { describe, expect, it } from "vitest";
import { findRoute } from "@/config/routes/routes";
import { trainingFormSpecs } from "@/modules/training-courses/form-specs";
import { buildLibraryParams, EMPTY_LIBRARY_FILTERS, LIBRARY_PAGE_SIZE } from "@/modules/badges/components/badge-library";

describe("badge config route", () => {
  const route = findRoute("/training/badge-config");

  it("nằm trong menu Huấn luyện và dùng màn hình cấu hình thẻ", () => {
    expect(route).toBeDefined();
    expect(route?.kind).toBe("badge-config");
    expect(route?.moduleName).toBe("training.badge-config");
    expect(route?.endpoint).toBe("/badges/config");
  });

  it("xem theo quyền training.badge_config.read.* và quản lý theo create / update / delete", () => {
    expect(route?.permissionPrefixes).toEqual(["training.badge_config.read."]);
    expect(route?.actionPermissionPrefixes).toEqual(["training.badge_config.create.", "training.badge_config.update.", "training.badge_config.delete."]);
  });
});

describe("course form attendance flags", () => {
  const spec = trainingFormSpecs.find((item) => item.kind === "courses" && !item.moduleName);

  it("có hai công tắc điểm danh và tự gửi email, mặc định tắt", () => {
    const names = spec?.fields.map((field) => field.name) ?? [];
    expect(names).toContain("attendanceEnabled");
    expect(names).toContain("autoSendInvitation");
    expect(spec?.fields.find((field) => field.name === "attendanceEnabled")?.type).toBe("switch");
    expect(spec?.fields.find((field) => field.name === "autoSendInvitation")?.type).toBe("switch");
    expect(spec?.getInitialValues?.(null)).toMatchObject({ attendanceEnabled: false, autoSendInvitation: false });
  });

  it("hai cờ nằm cùng một mục và giải thích mã QR chỉ gửi khi bật điểm danh", () => {
    const attendance = spec?.fields.find((field) => field.name === "attendanceEnabled");
    const auto = spec?.fields.find((field) => field.name === "autoSendInvitation");
    expect(attendance?.section).toBe(auto?.section);
    expect(attendance?.helper).toContain("Phải bật mới gửi được mã QR");
    expect(auto?.helper).toContain("kèm mã QR điểm danh nếu khóa bật điểm danh");
  });

  it("khóa quá khứ không có hai cờ này", () => {
    const past = trainingFormSpecs.find((item) => item.moduleName === "training.course.past");
    const names = past?.fields.map((field) => field.name) ?? [];
    expect(names).not.toContain("attendanceEnabled");
    expect(names).not.toContain("autoSendInvitation");
  });
});

describe("badge library params", () => {
  it("gửi trang và cỡ trang, bỏ qua điều kiện rỗng", () => {
    expect(buildLibraryParams({ search: "", filters: EMPTY_LIBRARY_FILTERS, page: 0 })).toBe(`page=0&size=${LIBRARY_PAGE_SIZE}`);
  });

  it("gửi từ khóa và bộ lọc dạng JSON", () => {
    const params = new URLSearchParams(buildLibraryParams({ search: "thẻ", filters: { scope: "DEANERY", hasBack: "true", paperSize: "" }, page: 2 }));
    expect(params.get("page")).toBe("2");
    expect(params.get("search")).toBe("thẻ");
    expect(JSON.parse(params.get("filters") ?? "{}")).toEqual({ scope: "DEANERY", hasBack: "true" });
  });
});
