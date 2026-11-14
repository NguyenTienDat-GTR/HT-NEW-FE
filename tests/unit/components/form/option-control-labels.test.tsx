import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveOptionSource } from "@/components/form/resource-form/api-utils";
import { FormField } from "@/components/form/resource-form/form-controls";
import type { FormFieldSpec } from "@/components/form/resource-form/types";
import { apiFetch } from "@/lib/api/client";
import type { AuthUser } from "@/lib/auth/auth-store";

vi.mock("@/lib/api/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api/client")>()), apiFetch: vi.fn() }));

const DEANERY_ID = "11111111-2222-3333-4444-555555555555";
const deaneryField = {
  name: "deaneryId",
  label: "Giáo hạt",
  type: "select",
  optionsEndpoint: "/parishes",
  optionValue: "deaneryId",
  optionLabel: "deaneryName",
} as FormFieldSpec;

function renderDeanery(value: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FormField field={deaneryField} mode="create" onChange={vi.fn()} value={value} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.mocked(apiFetch).mockReset();
});

describe("select showing a preselected id", () => {
  it("shows the unit name from the loaded rows, not the id", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ content: [{ id: "p1", name: "Bà Lụa", deaneryId: DEANERY_ID, deaneryName: "Thủ Dầu Một" }] });
    renderDeanery(DEANERY_ID);
    expect(await screen.findByRole("option", { name: "Thủ Dầu Một" })).toBeInTheDocument();
    expect((screen.getByLabelText("Giáo hạt") as HTMLSelectElement).value).toBe(DEANERY_ID);
    expect(screen.queryByText(DEANERY_ID)).not.toBeInTheDocument();
  });

  it("shows a loading label instead of the id while the names are still loading", () => {
    vi.mocked(apiFetch).mockReturnValue(new Promise(() => undefined));
    renderDeanery(DEANERY_ID);
    expect(screen.getByRole("option", { name: "Đang tải…" })).toBeInTheDocument();
    expect(screen.queryByText(DEANERY_ID)).not.toBeInTheDocument();
  });
});

describe("resolveOptionSource", () => {
  const user = { username: "a", roles: [], permissions: [] } as AuthUser;
  const base = { name: "deaneryId", label: "Giáo hạt", optionsEndpoint: "/deaneries", optionValue: "id", optionLabel: "name" } as FormFieldSpec;

  it("keeps the field's own endpoint, value key and label key when there is no per-account source", () => {
    expect(resolveOptionSource(base, {}, user)).toEqual({ optionsEndpoint: "/deaneries", optionValue: "id", optionLabel: "name" });
  });

  it("switches endpoint, value key and label key together when the account has its own source", () => {
    const field = { ...base, optionSourceForUser: () => ({ endpoint: "/parishes", optionValue: "deaneryId", optionLabel: "deaneryName" }) };
    expect(resolveOptionSource(field, {}, user)).toEqual({ optionsEndpoint: "/parishes", optionValue: "deaneryId", optionLabel: "deaneryName" });
  });

  it("still lets an endpoint that depends on other fields win", () => {
    const field = { ...base, buildOptionsEndpoint: () => "/parishes?x=1", optionSourceForUser: () => ({ endpoint: "/other", optionValue: "a", optionLabel: "b" }) };
    expect(resolveOptionSource(field, {}, user).optionsEndpoint).toBe("/parishes?x=1");
  });
});
