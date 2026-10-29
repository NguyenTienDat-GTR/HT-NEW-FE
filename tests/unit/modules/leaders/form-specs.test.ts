import { describe, expect, it } from "vitest";
import { personnelFormSpecs } from "@/modules/leaders/form-specs";

const spec = personnelFormSpecs.find((item) => item.kind === "leaders")!;
const field = (name: string) => spec.fields.find((item) => item.name === name)!;

describe("leader form spec", () => {
  it("requires the phone number", () => {
    expect(field("phoneNumber").required).toBe(true);
  });

  it("has a deanery field placed before the parish and filters parishes by it", () => {
    const names = spec.fields.map((item) => item.name);
    expect(names.indexOf("deaneryId")).toBeGreaterThanOrEqual(0);
    expect(names.indexOf("deaneryId")).toBeLessThan(names.indexOf("parishId"));
    const build = field("parishId").buildOptionsEndpoint!;
    expect(build({})).toBeUndefined();
    expect(decodeURIComponent(build({ deaneryId: "d1" })!)).toBe('/parishes?filters={"deanery.id":"d1"}');
  });

  it("does not send the deanery or the preview URL, but sends the uploaded image id", () => {
    const payload = spec.mapSubmit!(
      { holyName: "Phêrô", deaneryId: "d1", parishId: "p1", imageUrl: "/api/media/a/medium?exp=1&sig=x", imageAssetId: "asset-1" },
      "create",
    );
    expect(payload).not.toHaveProperty("deaneryId");
    expect(payload).not.toHaveProperty("imageUrl");
    expect(payload).toMatchObject({ parishId: "p1", imageAssetId: "asset-1" });
    expect(spec.extraValueNames).toContain("imageAssetId");
  });

  it("does not let the avatar be cleared, only replaced", () => {
    expect(field("imageUrl").clearable).toBeFalsy();
    const payload = spec.mapSubmit!({ holyName: "Phêrô", imageUrl: "/api/media/a/medium?exp=1&sig=x", imageAssetId: "asset-2" }, "edit");
    expect(payload.clearFields).toBeUndefined();
    expect(payload.imageAssetId).toBe("asset-2");
  });

  it("preselects the deanery of a deanery-scoped user", () => {
    expect(spec.getInitialValues!({ username: "a", roles: [], permissions: [], deaneryId: "d9" })).toEqual({ deaneryId: "d9" });
    expect(spec.getInitialValues!({ username: "a", roles: [], permissions: [] })).toEqual({});
  });
});
