import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildExportPath } from "@/components/common/resource/excel-export-button";
import { cellAddress, changeCase, colLetter, parseAddress, parseMerge, splitTokens, starterLayout } from "@/modules/registration-template/sheet-model";

describe("registration template helpers", () => {
  it("converts addresses both ways", () => {
    expect(colLetter(1)).toBe("A");
    expect(colLetter(27)).toBe("AA");
    expect(cellAddress(10, 9)).toBe("I10");
    expect(parseAddress("AA3")).toEqual({ row: 3, col: 27 });
    expect(parseMerge("B6:C7")).toEqual({ r1: 6, c1: 2, r2: 7, c2: 3 });
  });

  it("splits text into plain parts and field tokens", () => {
    expect(splitTokens("Xứ đoàn: {{tenXuDoan}} - {{tenGiaoXu}}")).toEqual([
      { text: "Xứ đoàn: " },
      { text: "{{tenXuDoan}}", key: "tenXuDoan" },
      { text: " - " },
      { text: "{{tenGiaoXu}}", key: "tenGiaoXu" },
    ]);
  });

  it("builds a starter layout with one data row of column fields and merged title lines", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("x");
    starterLayout(sheet);
    expect(sheet.getCell("A3").value).toContain("{{tenKhoa|upper}}");
    expect(sheet.getCell("A1").value).toContain("{{capVaTenDonVi}}");
    expect(sheet.getCell("C10").value).toBe("{{hoVaTen}}");
    expect(sheet.getCell("A1").isMerged).toBe(true);
    const buffer = await workbook.xlsx.writeBuffer();
    expect((buffer as ArrayBuffer).byteLength).toBeGreaterThan(1000);
  });
});

describe("export path", () => {
  it("drops paging and appends selected columns and options", () => {
    const extra = new URLSearchParams();
    extra.append("columns", "Họ và tên");
    extra.append("columns", "Email");
    const path = buildExportPath("/leaders", "page=2&size=10&search=An", extra);
    const params = new URLSearchParams(path.split("?")[1]);
    expect(path.startsWith("/leaders/export?")).toBe(true);
    expect(params.get("page")).toBeNull();
    expect(params.getAll("columns")).toEqual(["Họ và tên", "Email"]);
    expect(buildExportPath("/training/participations", "", new URLSearchParams("groupBy=PARISH"), "/template-export")).toBe(
      "/training/participations/template-export?groupBy=PARISH",
    );
  });
});

describe("preview sample data", () => {
  it("fills fields with sample values per row and keeps unknown fields", async () => {
    const { sampleText } = await import("@/modules/registration-template/sample-data");
    expect(sampleText("DANH SÁCH {{tenKhoa|upper}}", 0)).toBe("DANH SÁCH KHÓA HUẤN LUYỆN SA MẠC CẤP II/2027");
    expect(sampleText("{{stt}}", 2)).toBe("3");
    expect(sampleText("{{hoVaTen}}", 1)).not.toBe(sampleText("{{hoVaTen}}", 0));
    expect(sampleText("{{khongCo}}", 0)).toBe("{{khongCo}}");
  });
});

describe("change case", () => {
  it("uppercases plain text and tags fields so the exported value is uppercased too", () => {
    expect(changeCase("Xứ đoàn: {{tenXuDoan}}", "upper")).toBe("XỨ ĐOÀN: {{tenXuDoan|upper}}");
    expect(changeCase("Họ: {{hoVaTen|upper}}", "lower")).toBe("họ: {{hoVaTen|lower}}");
    expect(changeCase("ABC {{hoVaTen|upper}}", "none")).toBe("ABC {{hoVaTen}}");
  });

  it("recognises modifiers when splitting tokens", () => {
    expect(splitTokens("{{hoVaTen|upper}}")).toEqual([{ text: "{{hoVaTen|upper}}", key: "hoVaTen", mod: "upper" }]);
  });
});

describe("title case and field examples", () => {
  it("title-cases plain text and tags fields with |title", () => {
    expect(changeCase("XỨ ĐOÀN: {{tenXuDoan}}", "title")).toBe("Xứ Đoàn: {{tenXuDoan|title}}");
  });

  it("gives an example per field, honouring the chosen case", async () => {
    const { sampleFor } = await import("@/modules/registration-template/sample-data");
    expect(sampleFor("giaoPhanVaTen")).toBe("Giáo phận Phú Cường");
    expect(sampleFor("tenGiaoXu", "upper")).toBe("PHÚ HÒA");
    expect(sampleFor("hoVaTen", "title")).toBe("Nguyễn Văn An");
    expect(sampleFor("khongCo")).toBe("");
  });
});
