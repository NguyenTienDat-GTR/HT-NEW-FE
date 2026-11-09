import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { CourseCopySourcesField, estimateCopyCount, type CopySourceOption } from "@/components/form/resource-form/course-copy-sources-field";
import { trainingFormSpecs } from "@/modules/training-courses/form-specs";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api/client";

const longName = "Khóa huấn luyện Huynh trưởng cấp I dành cho các giáo xứ thuộc giáo hạt Thủ Dầu Một và các vùng lân cận";
const sources: CopySourceOption[] = [
  { courseCode: "a", courseName: longName, hostYear: 2024, courseTypeName: "Huấn luyện Huynh trưởng cấp I (Khai tâm)", pastCourse: false, startDate: null, endDate: null, ownerName: "Giáo phận Phú Cường", participantCount: 40, passedCount: 30 },
  { courseCode: "b", courseName: "Khóa cũ", hostYear: 2019, courseTypeName: null, pastCourse: true, startDate: null, endDate: null, ownerName: null, participantCount: 10, passedCount: 4 },
];

describe("estimateCopyCount", () => {
  it("counts every record or only passed ones of the selected sources", () => {
    expect(estimateCopyCount(sources, ["a", "b"], "ALL")).toBe(50);
    expect(estimateCopyCount(sources, ["a", "b"], "PASSED_ONLY")).toBe(34);
    expect(estimateCopyCount(sources, [], "ALL")).toBe(0);
  });
});

describe("CourseCopySourcesField", () => {
  it("shows the full source name, year and course type and reports selection and mode changes", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(sources);
    const onSelectedChange = vi.fn();
    const onModeChange = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CourseCopySourcesField courseTypeCode="HT1" mode="ALL" onModeChange={onModeChange} onSelectedChange={onSelectedChange} selected={[]} />
      </QueryClientProvider>,
    );
    const name = await screen.findByText(longName);
    // Tên dài phải xuống dòng, không bị cắt bằng dấu ba chấm.
    expect(name.className).toContain("break-words");
    expect(name.className).not.toContain("truncate");
    expect(screen.getByText("Năm tổ chức 2024")).toBeTruthy();
    expect(screen.getByText("Huấn luyện Huynh trưởng cấp I (Khai tâm)")).toBeTruthy();
    expect(screen.getByText("Khóa quá khứ")).toBeTruthy();
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe("/training/courses/copy-sources?courseTypeCode=HT1");

    await userEvent.click(screen.getByLabelText(/Khóa cũ/));
    expect(onSelectedChange).toHaveBeenCalledWith(["b"]);
    await userEvent.click(screen.getByLabelText(/Chỉ hồ sơ có kết quả đạt/));
    expect(onModeChange).toHaveBeenCalledWith("PASSED_ONLY");
  });
});

describe("course form spec", () => {
  const spec = trainingFormSpecs.find((item) => item.kind === "courses" && !item.moduleName)!;

  it("drops the registration window when registration is off and only sends copy options with sources", () => {
    const off = spec.mapSubmit!({ courseName: "K", registrationEnabled: false, registrationStartAt: "2026-01-01T08:00", registrationEndAt: "2026-01-02T08:00", copyMode: "PASSED_ONLY" }, "create");
    expect(off.registrationEnabled).toBe(false);
    expect(off.registrationStartAt).toBeUndefined();
    expect(off.copySourceCourseCodes).toBeUndefined();
    expect(off.copyMode).toBeUndefined();

    const on = spec.mapSubmit!({ courseName: "K", registrationEnabled: true, registrationStartAt: "2026-01-01T08:00", copySourceCourseCodes: ["a"], copyMode: "PASSED_ONLY" }, "create");
    expect(on.registrationEnabled).toBe(true);
    expect(on.registrationStartAt).toBe("2026-01-01T08:00:00+07:00");
    expect(on.copySourceCourseCodes).toEqual(["a"]);
    expect(on.copyMode).toBe("PASSED_ONLY");
  });

  it("hides the registration times when registration is off and offers the score flag on past courses", () => {
    const start = spec.fields.find((field) => field.name === "registrationStartAt")!;
    expect(start.visibleWhen!({ registrationEnabled: false }, "create")).toBe(false);
    expect(start.visibleWhen!({}, "create")).toBe(true);
    const past = trainingFormSpecs.find((item) => item.moduleName === "training.course.past" && item.actionType === "create")!;
    expect(past.fields.some((field) => field.name === "scoreVisible")).toBe(true);
  });
});
