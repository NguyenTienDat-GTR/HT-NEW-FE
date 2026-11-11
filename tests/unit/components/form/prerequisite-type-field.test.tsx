import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterPrerequisiteOptions,
  groupByLevel,
  prerequisiteOptionsEndpoint,
  PrerequisiteTypeField,
  type PrerequisiteOption,
} from "@/components/form/resource-form/prerequisite-type-field";
import { trainingFormSpecs } from "@/modules/training-courses/form-specs";

const apiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  getApiErrorMessage: () => "Lỗi",
}));

function option(patch: Partial<PrerequisiteOption>): PrerequisiteOption {
  return {
    typeCode: "T",
    typeName: "Khóa",
    managementUnitType: "DIOCESE",
    status: true,
    courseCount: 0,
    completedLeaderCount: 0,
    selectable: true,
    ...patch,
  };
}

const OPTIONS = [
  option({ typeCode: "DB", typeName: "Dự bị", managementUnitType: "DIOCESE", completedLeaderCount: 3 }),
  option({ typeCode: "C1", typeName: "Huấn luyện cấp 1", managementUnitType: "DEANERY", resultingLevelName: "Cấp 1", completedLeaderCount: 42, courseCount: 5 }),
  option({ typeCode: "C0", typeName: "Khóa mới", managementUnitType: "DEANERY" }),
];

afterEach(() => {
  cleanup();
  apiFetch.mockReset();
});

describe("prerequisite option helpers", () => {
  it("builds the endpoint with the owner level and the type being edited", () => {
    expect(prerequisiteOptionsEndpoint("DIOCESE")).toBe("/training/course-types/prerequisite-options?managementUnitType=DIOCESE");
    expect(prerequisiteOptionsEndpoint("DEANERY", "abc")).toBe("/training/course-types/prerequisite-options?managementUnitType=DEANERY&forTypeCode=abc");
  });

  it("filters by level, graduates and accent-insensitive keyword", () => {
    const codes = (items: PrerequisiteOption[]) => items.map((item) => item.typeCode);
    expect(codes(filterPrerequisiteOptions(OPTIONS, { keyword: "", level: "DEANERY", onlyWithGraduates: false }))).toEqual(["C1", "C0"]);
    expect(codes(filterPrerequisiteOptions(OPTIONS, { keyword: "", level: "ALL", onlyWithGraduates: true }))).toEqual(["DB", "C1"]);
    expect(codes(filterPrerequisiteOptions(OPTIONS, { keyword: "huan luyen cap", level: "ALL", onlyWithGraduates: false }))).toEqual(["C1"]);
  });

  it("groups diocese types before deanery types and drops empty groups", () => {
    expect(groupByLevel(OPTIONS).map((group) => [group.level, group.items.length])).toEqual([["DIOCESE", 1], ["DEANERY", 2]]);
    expect(groupByLevel([OPTIONS[1]]).map((group) => group.level)).toEqual(["DEANERY"]);
  });
});

function renderField(props: Partial<Parameters<typeof PrerequisiteTypeField>[0]> = {}) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PrerequisiteTypeField onChange={onChange} onClear={onClear} ownerLevel="DIOCESE" value="" {...props} />
    </QueryClientProvider>,
  );
  return { onChange, onClear };
}

describe("PrerequisiteTypeField", () => {
  it("lets a diocese type pick a deanery type from the dialog", async () => {
    apiFetch.mockResolvedValue(OPTIONS);
    const { onChange } = renderField();
    fireEvent.click(screen.getByRole("button", { name: "Chọn khóa tiên quyết" }));
    expect(await screen.findByText("Dự bị")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Cấp giáo hạt/ }));
    expect(screen.queryByText("Dự bị")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Huấn luyện cấp 1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Chọn khóa này" }));
    expect(onChange).toHaveBeenCalledWith("C1");
    expect(apiFetch).toHaveBeenCalledWith("/training/course-types/prerequisite-options?managementUnitType=DIOCESE");
  });

  it("shows the chosen deanery type with its stats and clears on request", async () => {
    apiFetch.mockResolvedValue(OPTIONS);
    const { onClear } = renderField({ value: "C1" });
    expect(await screen.findByText("Huấn luyện cấp 1")).toBeTruthy();
    expect(screen.getByText(/ở bất kỳ giáo hạt nào/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ khóa tiên quyết" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("drops a selection that is not valid for the owner level", async () => {
    apiFetch.mockResolvedValue([OPTIONS[1]]);
    const { onClear } = renderField({ value: "DB", ownerLevel: "DEANERY", currentName: "Dự bị" });
    await waitFor(() => expect(onClear).toHaveBeenCalled());
  });

  it("disables a type that would create a cycle", async () => {
    apiFetch.mockResolvedValue([option({ typeCode: "X", typeName: "Khóa vòng", selectable: false, disabledReason: "Tạo vòng lặp" })]);
    renderField();
    fireEvent.click(screen.getByRole("button", { name: "Chọn khóa tiên quyết" }));
    const row = await screen.findByRole("radio", { name: /Khóa vòng/ });
    expect((row as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Tạo vòng lặp/)).toBeTruthy();
  });
});

describe("course type submit payload", () => {
  const spec = trainingFormSpecs.find((item) => item.kind === "course-types")!;

  it("sends clearPrerequisite and resets the time limit when the prerequisite is removed on edit", () => {
    const payload = spec.mapSubmit!({ typeCode: "A", typeName: "Khóa", prerequisiteTypeCode: "", clearPrerequisite: true, maxYearsAfterPrerequisite: 3 }, "edit");
    expect(payload.clearPrerequisite).toBe(true);
    expect(payload.clearMaxYearsAfterPrerequisite).toBe(true);
    expect(payload.maxYearsAfterPrerequisite).toBeUndefined();
  });

  it("does not send the clear flag when a prerequisite is chosen or on create", () => {
    expect(spec.mapSubmit!({ prerequisiteTypeCode: "C1", clearPrerequisite: false }, "edit").clearPrerequisite).toBeUndefined();
    expect(spec.mapSubmit!({ clearPrerequisite: true }, "create").clearPrerequisite).toBeUndefined();
  });
});
