import { describe, expect, it } from "vitest";
import { getAccountCreateExcludedRoleCodes } from "@/modules/accounts/form-specs";
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
