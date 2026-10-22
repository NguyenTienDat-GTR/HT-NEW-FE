import { describe, expect, it } from "vitest";
import { deltaTone, formatDelta } from "@/modules/analytics/components/kpi-card";
import { excelFileName } from "@/modules/analytics/excel";
import { effectiveRange } from "@/modules/analytics/presets";
import { columnLabel, exportableColumns, formatRecordValue, sanitizeFileName, sanitizeSheetName } from "@/modules/analytics/record-format";
import { defaultFilters } from "@/modules/analytics/types";

describe("excel export helpers", () => {
  it("names files and sheets in Vietnamese without characters Windows or Excel reject", () => {
    const day = new Date(2026, 9, 22);
    expect(excelFileName("leaders", undefined, day)).toBe("Danh sách huynh trưởng - 22-10-2026.xlsx");
    expect(excelFileName("participations", "Hồ sơ đăng ký · Sa mạc: cấp 1/2", day)).toBe("Danh sách hồ sơ đăng ký khóa huấn luyện - Sa mạc- cấp 1-2 - 22-10-2026.xlsx");
    expect(sanitizeFileName('a\\b/c:d*e?f"g<h>i|j')).toBe("a-b-c-d-e-f-g-h-i-j");
    expect(sanitizeSheetName("Huynh trưởng [1]: tổng/hợp?*")).toBe("Huynh trưởng -1-- tổng-hợp--");
    expect(sanitizeSheetName("x".repeat(50))).toHaveLength(31);
  });

  it("translates every cell to Vietnamese", () => {
    expect(formatRecordValue("gender", "NU")).toBe("Nữ");
    expect(formatRecordValue("result", "COMPLETED")).toBe("Đạt");
    expect(formatRecordValue("result", "UNCOMPLETED")).toBe("Chưa đạt");
    expect(formatRecordValue("approvalStatus", "APPROVED")).toBe("Đã duyệt");
    expect(formatRecordValue("startDate", "2026-10-22")).toBe("22/10/2026");
    expect(formatRecordValue("active", true)).toBe("Có");
    expect(formatRecordValue("score", 7.33)).toBe("7,33");
    expect(formatRecordValue("name", "Giuse Nguyễn Văn A")).toBe("Giuse Nguyễn Văn A");
    expect(formatRecordValue("name", null)).toBe("");
  });

  it("hides internal ids from the column picker but keeps business codes and Vietnamese labels", () => {
    expect(exportableColumns(["id", "code", "leaderName"])).toEqual(["code", "leaderName"]);
    expect(columnLabel("leaderName")).toBe("Tên thánh và họ tên");
    expect(columnLabel("code")).toBe("Mã chứng nhận");
  });

  it("resolves the effective period like the backend default of 12 months", () => {
    expect(effectiveRange(defaultFilters, new Date(2026, 9, 22))).toEqual({ from: "2025-11-01", to: "2026-10-22" });
  });
});

describe("delta presentation", () => {
  it("colours by direction and whether up is good, never for neutral metrics", () => {
    expect(deltaTone(5, true)).toBe("good");
    expect(deltaTone(5, false)).toBe("bad");
    expect(deltaTone(-5, false)).toBe("good");
    expect(deltaTone(0, true)).toBe("neutral");
    expect(deltaTone(5, undefined)).toBe("neutral");
  });

  it("shows percentage points for rates and relative change for counts", () => {
    expect(formatDelta({ unit: "PERCENT", delta: -2.5, deltaPct: null })).toBe("−2,5 điểm");
    expect(formatDelta({ unit: "COUNT", delta: 5, deltaPct: 50 })).toBe("+50%");
    expect(formatDelta({ unit: "COUNT", delta: 5, deltaPct: null })).toBe("+5");
    expect(formatDelta({ unit: "COUNT", delta: null, deltaPct: null })).toBeNull();
  });
});

describe("workbook content", () => {
  it("writes a Vietnamese sheet with title, selected columns only and real dates", async () => {
    const { buildWorkbook } = await import("@/modules/analytics/excel");
    const workbook = await buildWorkbook({
      dataset: "participations",
      columns: ["leaderName", "startDate", "result", "score"],
      rows: [{ id: "1", leaderName: "Giuse Nguyễn Văn A", startDate: "2026-10-20", result: "COMPLETED", score: 7.33, courseName: "Bỏ qua" }],
      scopeTitle: "Hồ sơ đăng ký · Nữ",
      period: { from: "2025-11-01", to: "2026-10-22" },
      generatedAt: new Date(2026, 9, 22, 9, 5),
    });
    const sheet = workbook.getWorksheet("Hồ sơ đăng ký");
    expect(sheet).toBeDefined();
    expect(sheet!.getCell("A1").value).toBe("Danh sách hồ sơ đăng ký khóa huấn luyện");
    expect(sheet!.getCell("A2").value).toBe("Phạm vi: Hồ sơ đăng ký · Nữ");
    expect(sheet!.getCell("A3").value).toBe("Khoảng thời gian: 01/11/2025 – 22/10/2026");
    expect(sheet!.getCell("A4").value).toBe("Ngày xuất: 22/10/2026 09:05");
    expect(sheet!.getRow(7).values).toEqual([undefined, "Tên thánh và họ tên", "Ngày bắt đầu khóa", "Kết quả", "Điểm"]);
    expect(sheet!.getCell("A8").value).toBe("Giuse Nguyễn Văn A");
    expect(sheet!.getCell("B8").value).toBeInstanceOf(Date);
    expect(sheet!.getCell("C8").value).toBe("Đạt");
    expect(sheet!.getCell("D8").value).toBe(7.33);
    expect(sheet!.columnCount).toBe(4);
  });
});

describe("sheet preview", () => {
  it("previews exactly what the file will contain: Vietnamese names, headers and first rows", async () => {
    const { buildSheetPreview } = await import("@/modules/analytics/excel");
    const preview = buildSheetPreview(
      {
        dataset: "leaders",
        columns: ["name", "gender", "active"],
        rows: Array.from({ length: 30 }, (_, index) => ({ id: String(index), name: `Giuse Nguyễn ${index}`, gender: "NAM", active: true })),
        period: null,
        generatedAt: new Date(2026, 9, 22, 9, 5),
      },
      5,
    );
    expect(preview.fileName).toBe("Danh sách huynh trưởng - 22-10-2026.xlsx");
    expect(preview.sheetName).toBe("Huynh trưởng");
    expect(preview.headers).toEqual(["Tên thánh và họ tên", "Giới tính", "Đang hoạt động"]);
    expect(preview.rows).toHaveLength(5);
    expect(preview.rows[0]).toEqual(["Giuse Nguyễn 0", "Nam", "Có"]);
    expect(preview.total).toBe(30);
    expect(preview.infoLines).toContain("Thời điểm: số liệu hiện tại");
    expect(preview.infoLines).toContain("Tổng số dòng: 30");
  });
});
