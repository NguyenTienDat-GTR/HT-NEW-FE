import { describe, expect, it } from "vitest";
import { getAccountCreateExcludedRoleCodes, systemFormSpecs } from "@/modules/accounts/form-specs";
import type { AuthUser } from "@/lib/auth/auth-store";

function user(roles: string[]): AuthUser {
  return {
    username: "admin",
    roles,
    permissions: [],
  };
}

describe("account form specs", () => {
  it("allows diocese admins to create accounts with lower admin roles", () => {
    expect(getAccountCreateExcludedRoleCodes(user(["ADMIN_DIOCESE"]))).toEqual(["SUPER_ADMIN", "ADMIN_DIOCESE"]);
  });

  it("allows deanery admins to create accounts with parish admin role", () => {
    expect(getAccountCreateExcludedRoleCodes(user(["ADMIN_DEANERY"]))).toEqual(["SUPER_ADMIN", "ADMIN_DIOCESE", "ADMIN_DEANERY"]);
  });

  it("does not expose admin system roles to parish admins", () => {
    expect(getAccountCreateExcludedRoleCodes(user(["ADMIN_PARISH"]))).toEqual(["SUPER_ADMIN", "ADMIN_DIOCESE", "ADMIN_DEANERY", "ADMIN_PARISH"]);
  });

  it("does not hide system admin roles from super admins", () => {
    expect(getAccountCreateExcludedRoleCodes(user(["SUPER_ADMIN"]))).toEqual([]);
  });
});

describe("super admin account create form", () => {
  const spec = systemFormSpecs.find((item) => item.kind === "accounts" && item.superAdminOnly)!;
  const field = (name: string) => spec.fields.find((item) => item.name === name)!;

  it("lists roles from the API but never offers deanery or parish admin", () => {
    const roleField = field("roleCode");
    expect(roleField.optionsEndpoint).toBe("/system/roles");
    expect(roleField.excludeOptionValues).toEqual(["ADMIN_DEANERY", "ADMIN_PARISH"]);
  });

  it("requires the credential email for every role", () => {
    const requiredWhen = field("credentialEmail").requiredWhen!;
    expect(requiredWhen({ roleCode: "QUAN_TRI_HE_THONG" }, "create")).toBe(true);
    expect(requiredWhen({ roleCode: "ADMIN_DIOCESE" }, "create")).toBe(true);
    expect(requiredWhen({}, "create")).toBe(false);
  });

  it("only sends dioceseId for ADMIN_DIOCESE and never a leader", () => {
    expect(spec.mapSubmit!({ roleCode: "QUAN_TRI_HE_THONG", dioceseId: "d1", leaderId: "l1", credentialEmail: "a@b.vn" }, "create")).toEqual({
      roleCode: "QUAN_TRI_HE_THONG",
      credentialEmail: "a@b.vn",
    });
    expect(spec.mapSubmit!({ roleCode: "ADMIN_DIOCESE", dioceseId: "d1", credentialEmail: "a@b.vn" }, "create")).toEqual({
      roleCode: "ADMIN_DIOCESE",
      dioceseId: "d1",
      credentialEmail: "a@b.vn",
    });
  });
});

describe("account create form (non super admin)", () => {
  const spec = systemFormSpecs.find((item) => item.kind === "accounts" && !item.superAdminOnly && item.fields.some((f) => f.name === "leaderId"))!;
  const field = (name: string) => spec.fields.find((item) => item.name === name)!;
  const visible = (name: string, roles: string[]) => field(name).visibleWhen!({}, "create", user(roles));

  it("shows deanery and parish dropdowns for diocese scope, only parish for deanery scope, none for parish scope", () => {
    expect([visible("accountDeaneryFilter", ["ADMIN_DIOCESE"]), visible("accountParishFilter", ["ADMIN_DIOCESE"])]).toEqual([true, true]);
    expect([visible("accountDeaneryFilter", ["ADMIN_DEANERY"]), visible("accountParishFilter", ["ADMIN_DEANERY"])]).toEqual([false, true]);
    expect([visible("accountDeaneryFilter", ["ADMIN_PARISH"]), visible("accountParishFilter", ["ADMIN_PARISH"])]).toEqual([false, false]);
  });

  it("filters parishes by the chosen deanery", () => {
    const build = field("accountParishFilter").buildOptionsEndpoint!;
    expect(build({})).toBeUndefined();
    expect(decodeURIComponent(build({ accountDeaneryFilter: "d1" })!)).toBe('/parishes?filters={"deanery.id":"d1"}');
  });

  it("narrows leader candidates by parish first, then deanery, and searches on the server", () => {
    const leader = field("leaderId");
    const build = (values: Record<string, unknown>) => decodeURIComponent(leader.buildOptionsEndpoint!(values)!);
    expect(build({})).toBe("/leaders/account-candidates");
    expect(build({ accountDeaneryFilter: "d1" })).toBe('/leaders/account-candidates?filters={"parish.deanery.id":"d1"}');
    expect(build({ accountDeaneryFilter: "d1", accountParishFilter: "p1" })).toBe('/leaders/account-candidates?filters={"parish.id":"p1"}');
    expect(leader.optionSearchParam).toBe("search");
    expect(leader.serverFiltered).toBe(true);
    // Tên hiển thị gồm tên thánh + họ tên + giáo xứ, không phải mã.
    expect(leader.optionLabelFields).toEqual(["holyName", "fullName", "parishName"]);
  });

  it("does not send the filter dropdowns to the backend", () => {
    const payload = spec.mapSubmit!({ leaderId: "l1", accountDeaneryFilter: "d1", accountParishFilter: "p1", roleCodes: ["ADMIN_PARISH"] }, "create");
    expect(payload).not.toHaveProperty("accountDeaneryFilter");
    expect(payload).not.toHaveProperty("accountParishFilter");
    expect(payload).toMatchObject({ leaderId: "l1", roleCodes: ["ADMIN_PARISH"], primaryRoleCode: "ADMIN_PARISH" });
  });
});
