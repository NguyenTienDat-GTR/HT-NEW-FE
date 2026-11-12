import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoreStats } from "@/components/common/resource/score-stats";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api/client";

afterEach(cleanup);

const components = [
  { id: "a", name: "Chuyên cần", maxScore: 10 },
  { id: "b", name: "Thành phần điểm có tên rất dài để kiểm tra việc cắt chữ", maxScore: 10 },
];

function renderStats(drafts = {}) {
  vi.mocked(apiFetch).mockResolvedValue({
    content: [
      { id: "1", participationStatus: "ATTENDED", componentScores: [{ componentId: "a", score: 8 }] },
      { id: "2", participationStatus: "ATTENDED", componentScores: [] },
      { id: "3", participationStatus: "CANCELLED", componentScores: [] },
    ],
    last: true,
  });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ScoreStats components={components} courseCode="KH-1" drafts={drafts} endpoint="/training/participants" />
    </QueryClientProvider>,
  );
}

describe("ScoreStats", () => {
  it("counts people and columns still missing scores, ignoring cancelled records", async () => {
    renderStats();
    const group = await screen.findByRole("group", { name: "Thống kê nhập điểm" });

    expect(group).toHaveTextContent("Chưa nhập đủ điểm");
    // Số thiếu và tổng nằm ở hai thẻ span liền nhau nên giữa chúng không chắc có khoảng trắng.
    expect(group).toHaveTextContent(/2\s*\/\s*2 người/);
    expect(screen.getByText("Thiếu 1")).toBeInTheDocument();
    expect(screen.getByText("Thiếu 2")).toBeInTheDocument();
  });

  it("drops the missing count as scores are typed without saving", async () => {
    renderStats({ "2": { row: {}, values: { a: "7", b: "6" } }, "1": { row: {}, values: { b: "9" } } });
    const group = await screen.findByRole("group", { name: "Thống kê nhập điểm" });

    expect(group).toHaveTextContent(/0\s*\/\s*2 người/);
    expect(screen.getAllByText("Đủ")).toHaveLength(2);
  });

  it("uses small single-line chips and truncates long column names with the full name in the tooltip", async () => {
    renderStats();
    const group = await screen.findByRole("group", { name: "Thống kê nhập điểm" });
    const chip = group.firstElementChild as HTMLElement;

    expect(chip.className).toContain("min-h-7");
    expect(chip.className).toContain("text-[11px]");
    expect(chip.className).toContain("whitespace-nowrap");
    expect(chip.className).not.toContain("min-h-9");

    const longName = screen.getByTitle(components[1]!.name);
    expect(longName.className).toContain("truncate");
    expect(longName.className).toContain("max-w-28");
  });
});
