import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
const apiMutation = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  apiMutation: (...args: unknown[]) => apiMutation(...args),
}));

import { NEW_CONFIG, configLibraryApi, resolveConfigId } from "@/modules/layout-config/use-config-library";

const configs = [
  { id: "a", isDefault: false, editable: true },
  { id: "b", isDefault: true, editable: false },
  { id: "c", isDefault: true, editable: true },
];

describe("resolveConfigId", () => {
  it("returns null until the option list has loaded", () => {
    expect(resolveConfigId(undefined, null)).toBeNull();
  });

  it("keeps the user's selection when it still exists, or the new-config marker", () => {
    expect(resolveConfigId(configs, "a")).toBe("a");
    expect(resolveConfigId(configs, NEW_CONFIG)).toBe(NEW_CONFIG);
  });

  it("falls back to the editable default, then any default, then the first, then a new config", () => {
    expect(resolveConfigId(configs, "gone")).toBe("c");
    expect(resolveConfigId(configs.slice(0, 2), null)).toBe("b");
    expect(resolveConfigId([{ id: "x" }], null)).toBe("x");
    expect(resolveConfigId([], null)).toBe(NEW_CONFIG);
  });
});

describe("configLibraryApi", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiMutation.mockReset();
  });

  it("builds every endpoint under the base path", () => {
    const api = configLibraryApi("/badges/config");
    api.options();
    api.fields();
    api.list("page=0");
    api.detail("7");
    api.create({ name: "n" });
    api.update("7", { name: "m" });
    api.setDefault("7");
    api.remove("7");

    expect(apiFetch.mock.calls.map((call) => call[0])).toEqual(["/badges/config/options", "/badges/config/fields", "/badges/config?page=0", "/badges/config/7"]);
    expect(apiMutation.mock.calls).toEqual([
      ["/badges/config", "POST", { name: "n" }],
      ["/badges/config/7", "PUT", { name: "m" }],
      ["/badges/config/7/default", "PUT"],
      ["/badges/config/7", "DELETE"],
    ]);
  });
});
