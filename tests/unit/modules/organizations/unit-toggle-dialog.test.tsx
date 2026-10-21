import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnitToggleDialog, canSubmitUnitToggle } from "@/modules/organizations/components/unit-toggle-dialog";
import { isLockedByParent } from "@/modules/organizations/types";

const apiFetch = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  apiMutation: vi.fn(),
  getApiErrorMessage: (error: unknown) => String(error),
}));

const impact = {
  unitType: "DEANERY",
  currentlyActive: true,
  childDeaneries: 0,
  childParishes: 7,
  affectedAccounts: 12,
  leaders: 90,
  openCourses: 1,
  pendingRegistrations: 3,
  pendingCertificates: 2,
};

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UnitToggleDialog endpoint="/deaneries" onClose={() => undefined} unitId="d1" unitLabel="giáo hạt" unitName="Giáo hạt A" />
    </QueryClientProvider>,
  );
}

describe("canSubmitUnitToggle", () => {
  it("requires the exact confirmation text and a reason when disabling", () => {
    expect(canSubmitUnitToggle({ confirmText: "Xác nhận", disabling: true, impactLoaded: true, reason: "  " })).toBe(false);
    expect(canSubmitUnitToggle({ confirmText: "Xac nhan", disabling: true, impactLoaded: true, reason: "Sáp nhập" })).toBe(false);
    expect(canSubmitUnitToggle({ confirmText: "Xác nhận", disabling: true, impactLoaded: true, reason: "Sáp nhập" })).toBe(true);
  });

  it("does not require a reason when enabling and waits for the impact to load", () => {
    expect(canSubmitUnitToggle({ confirmText: "Xác nhận", disabling: false, impactLoaded: true, reason: "" })).toBe(true);
    expect(canSubmitUnitToggle({ confirmText: "Xác nhận", disabling: false, impactLoaded: false, reason: "" })).toBe(false);
  });
});

describe("isLockedByParent", () => {
  it("is true only for enabled units whose effective status is off", () => {
    expect(isLockedByParent({ status: true, effectiveStatus: false })).toBe(true);
    expect(isLockedByParent({ status: false, effectiveStatus: false })).toBe(false);
    expect(isLockedByParent({ status: true, effectiveStatus: true })).toBe(false);
  });
});

describe("UnitToggleDialog", () => {
  beforeEach(() => apiFetch.mockReset());

  it("shows the impact summary and a required reason field when disabling", async () => {
    apiFetch.mockResolvedValue(impact);
    renderDialog();

    await waitFor(() => expect(screen.getByText("Tài khoản bị khóa")).toBeInTheDocument());
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/Lý do ngưng hoạt động/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ngưng hoạt động" })).toBeDisabled();
    expect(apiFetch).toHaveBeenCalledWith("/deaneries/d1/toggle-impact");
  });

  it("offers re-enabling without a reason field for an inactive unit", async () => {
    apiFetch.mockResolvedValue({ ...impact, currentlyActive: false });
    renderDialog();

    await waitFor(() => expect(screen.getByRole("button", { name: "Bật lại" })).toBeInTheDocument());
    expect(screen.queryByText(/Lý do ngưng hoạt động/)).not.toBeInTheDocument();
  });
});
