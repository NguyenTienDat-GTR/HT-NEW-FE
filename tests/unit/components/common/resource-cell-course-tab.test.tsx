import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmbeddedResourceProvider } from "@/components/common/resource/embedded-resource-context";
import { ResourceCell } from "@/components/common/resource/resource-format";

const embedded = { basePath: "/training/courses/KH-1", tab: "participations" } as never;
const row = { leaderHolyName: "Phêrô", leaderFullName: "Nguyễn Tiến Đạt", parishName: "Giáo xứ Lái Thiêu", deaneryName: "Giáo hạt Thủ Dầu Một" };

function cell(column: string, value: unknown, inCourse = true) {
  const node = <ResourceCell column={column} row={row} value={value} />;
  return render(inCourse ? <EmbeddedResourceProvider value={embedded}>{node}</EmbeddedResourceProvider> : node);
}

describe("ResourceCell in course tabs", () => {
  it("shows the full name without clamping", () => {
    cell("leaderFullName", row.leaderFullName);
    const name = screen.getByText("Phêrô Nguyễn Tiến Đạt");
    expect(name.className).not.toContain("line-clamp");
  });

  it("shows parish and deanery without the unit prefix and without clamping", () => {
    cell("parishName", row.parishName);
    const parish = screen.getByText("Lái Thiêu");
    expect(parish.className).not.toContain("line-clamp");
  });

  it("keeps the prefix outside course tabs", () => {
    cell("parishName", row.parishName, false);
    expect(screen.getByText("Giáo xứ Lái Thiêu")).toBeInTheDocument();
  });

  it("applies the same display to the leader list through fullNames", () => {
    render(<ResourceCell column="parishId" fullNames row={{ parishId: "uuid-1", parishName: "Giáo xứ Lái Thiêu" }} value="uuid-1" />);
    const parish = screen.getByText("Lái Thiêu");
    expect(parish.className).not.toContain("line-clamp");
  });

  it("clamps notes but exposes the full text for a tooltip", () => {
    const note = "Ghi chú rất dài ".repeat(10).trim();
    cell("registrationNote", note);
    const shown = screen.getByText(note);
    expect(shown.className).toContain("line-clamp-1");
    expect(shown).toHaveAttribute("tabindex", "0");
  });
});
