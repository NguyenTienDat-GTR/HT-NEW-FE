import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/auth-store";
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

  const account = (roles: string[], units: Partial<AuthUser> = {}): AuthUser => ({ username: "a", roles, permissions: [], ...units });

  it("preselects only the deanery for a deanery-level account", () => {
    expect(spec.getInitialValues!(account(["ADMIN_DEANERY"], { deaneryId: "d9", parishId: "p9" }))).toEqual({ deaneryId: "d9" });
    expect(spec.getInitialValues!(account(["ROLE_ADMIN_DEANERY"], { deaneryId: "d9" }))).toEqual({ deaneryId: "d9" });
    expect(spec.getInitialValues!(account(["ADMIN_DEANERY"]))).toEqual({});
  });

  it("preselects both the deanery and the parish for a parish-level account", () => {
    expect(spec.getInitialValues!(account(["ADMIN_PARISH"], { deaneryId: "d9", parishId: "p9" }))).toEqual({ deaneryId: "d9", parishId: "p9" });
    expect(spec.getInitialValues!(account(["ADMIN_PARISH"], { parishId: "p9" }))).toEqual({ parishId: "p9" });
  });

  it("preselects nothing for a diocese-level account, even when its linked leader gives it a deanery and a parish", () => {
    expect(spec.getInitialValues!(account(["ADMIN_DIOCESE"], { dioceseId: "g1", deaneryId: "d9", parishId: "p9" }))).toEqual({});
    expect(spec.getInitialValues!(account(["SUPER_ADMIN"], { deaneryId: "d9", parishId: "p9" }))).toEqual({});
    expect(spec.getInitialValues!(account(["ADMIN_DIOCESE", "ADMIN_PARISH"], { deaneryId: "d9", parishId: "p9" }))).toEqual({});
    expect(spec.getInitialValues!(null)).toEqual({});
  });

  it("reads the deanery from the account's own parish row when the account cannot list deaneries", () => {
    const source = field("deaneryId").optionSourceForUser!;
    expect(source({ ...account(["ADMIN_PARISH"]), permissions: ["organization.parish.read.parish"] })).toEqual({
      endpoint: "/parishes",
      optionValue: "deaneryId",
      optionLabel: "deaneryName",
    });
    expect(source({ ...account(["ADMIN_DEANERY"]), permissions: ["organization.deanery.read.deanery"] })).toBeUndefined();
    expect(source({ ...account(["ADMIN_DIOCESE"]), permissions: ["organization.deanery.read.diocese"] })).toBeUndefined();
    expect(source({ ...account(["SUPER_ADMIN"]), permissions: ["organization.deanery.read.all"] })).toBeUndefined();
  });
});

describe("họ và tên huynh trưởng", () => {
  it("từ chối tên chỉ một từ và nhận tên đủ họ tên", async () => {
    const { personnelFormSpecs } = await import("@/modules/leaders/form-specs");
    const spec = personnelFormSpecs.find((item) => item.actionType === "create" || item.fields.some((field) => field.name === "fullName"))!;
    const validate = spec.fields.find((field) => field.name === "fullName")!.validate!;
    expect(validate("dfdf", {})).toContain("họ và tên");
    expect(validate("Nguyễn Văn An", {})).toBeUndefined();
    expect(validate("", {})).toBeUndefined();
  });
});
