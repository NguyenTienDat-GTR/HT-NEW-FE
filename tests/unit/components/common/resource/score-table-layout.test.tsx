import { ChartBar } from "@phosphor-icons/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmbeddedResourceProvider } from "@/components/common/resource/embedded-resource-context";
import { ResourceCardList } from "@/components/common/resource/resource-card-list";
import { ResourceTable } from "@/components/common/resource/resource-table";
import type { ScoreEntry } from "@/components/common/resource/score-entry";
import type { RouteConfig } from "@/config/routes/routes";

afterEach(cleanup);

const route = {
  path: "/training/scores",
  moduleName: "training.score",
  title: "Chấm điểm",
  subtitle: "",
  endpoint: "/training/participants",
  idField: "id",
  kind: "participations",
  icon: ChartBar,
  columns: ["leaderFullName", "parishName", "deaneryName", "totalScore", "passed"],
  sortFields: { leaderFullName: "leader.firstName+leader.lastName", parishName: "leader.parish.name" },
} as unknown as RouteConfig;

const components = Array.from({ length: 8 }, (_, index) => ({ id: `c${index}`, name: `Thành phần điểm số ${index + 1}`, maxScore: 10, coefficient: 1 }));

const scoreEntry: ScoreEntry = {
  notes: { drafts: {}, editable: true, valueOf: () => "", isDirty: () => false, onChange: () => undefined },
  components,
  drafts: {},
  isEditable: () => true,
  valueOf: () => "",
  isInvalid: () => false,
  onChange: () => undefined,
};

const rows = [{ id: "p1", leaderFullName: "Nguyễn Văn An", parishName: "Giáo xứ Chánh Tòa Thánh Tâm", deaneryName: "Giáo hạt Thủ Dầu Một", totalScore: 7.5, passed: true }];

function renderTable(withScoreEntry: boolean) {
  return render(
    <TooltipProvider>
      <EmbeddedResourceProvider value={{ basePath: "/training/courses/X", tab: "scores", fixedFilters: { "course.courseCode": "X" } }}>
        <ResourceTable isLoading={false} page={0} rows={rows} route={route} scoreEntry={withScoreEntry ? scoreEntry : undefined} size={10} sort={() => undefined} sortDirection="ASC" />
      </EmbeddedResourceProvider>
    </TooltipProvider>,
  );
}

describe("score table layout", () => {
  it("shows the compact Giáo xứ header instead of the long unit label", () => {
    renderTable(true);
    expect(screen.getByRole("columnheader", { name: "Giáo xứ" })).toBeInTheDocument();
    expect(screen.queryByText(/giáo họ \/ giáo điểm/i)).not.toBeInTheDocument();
  });

  it("keeps the long label on tables that are not score entry", () => {
    renderTable(false);
    expect(screen.getByRole("columnheader", { name: /Giáo xứ \/ giáo họ \/ giáo điểm/i })).toBeInTheDocument();
  });

  it("keeps headers on one line, gives text columns a minimum width and fixes the score columns", () => {
    renderTable(true);
    const parishHeader = screen.getByRole("columnheader", { name: "Giáo xứ" });
    expect(parishHeader.className).toContain("whitespace-nowrap");
    expect(parishHeader.className).toContain("min-w-40");
    const scoreHeader = screen.getByRole("columnheader", { name: /Thành phần điểm số 1/ });
    expect(scoreHeader.className).toContain("w-32");
    expect(scoreHeader.className).toContain("min-w-32");
    // Tên cột điểm dài được cắt ở hai dòng, đầy đủ nằm ở tooltip.
    expect(within(scoreHeader).getByText("Thành phần điểm số 1").className).toContain("line-clamp-2");
    expect(scoreHeader.getAttribute("title")).toContain("Tối đa 10 · hệ số 1");
  });

  it("pins the order number and leader columns on the left and the actions column on the right", () => {
    renderTable(true);
    expect(screen.getByRole("columnheader", { name: "STT" }).className).toContain("left-0");
    expect(screen.getByRole("columnheader", { name: "Huynh trưởng" }).className).toContain("left-12");
    const actionsHeader = screen.getByRole("columnheader", { name: "Thao tác" });
    expect(actionsHeader.className).toContain("sticky");
    expect(actionsHeader.className).toContain("right-0");
    expect(actionsHeader.className).toContain("whitespace-nowrap");
    // Ô dữ liệu cùng cột cũng được ghim để không trượt dưới tiêu đề.
    const leaderCell = screen.getByText("Nguyễn Văn An").closest("td");
    expect(leaderCell?.className).toContain("sticky");
    expect(leaderCell?.className).toContain("left-12");
  });

  it("does not freeze columns or limit the height on ordinary tables", () => {
    const { container } = renderTable(false);
    expect(screen.getByRole("columnheader", { name: "STT" }).className).not.toContain("left-0");
    expect(container.firstElementChild?.className).not.toContain("max-h-");
  });

  it("scrolls the score table inside its own frame", () => {
    const { container } = renderTable(true);
    expect(container.firstElementChild?.className).toContain("overflow-x-auto");
    expect(container.firstElementChild?.className).toContain("max-h-[70vh]");
  });

  it("uses the compact parish label in the mobile card list too", () => {
    render(<ResourceCardList columns={route.columns} isLoading={false} renderActions={() => null} route={route} rows={rows} scoreEntry={scoreEntry} size={10} />);
    expect(screen.getByText("Giáo xứ")).toBeInTheDocument();
    expect(screen.queryByText(/giáo họ \/ giáo điểm/i)).not.toBeInTheDocument();
  });
});
