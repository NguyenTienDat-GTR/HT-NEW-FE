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
