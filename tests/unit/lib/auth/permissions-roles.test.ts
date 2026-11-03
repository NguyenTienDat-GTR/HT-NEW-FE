import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/auth-store";
import { hasAnyRole } from "@/lib/auth/permissions";

const user = (roles: string[]): AuthUser => ({ username: "u", roles, permissions: [] }) as unknown as AuthUser;

describe("hasAnyRole", () => {
  it("accepts roles with or without the ROLE_ prefix", () => {
    expect(hasAnyRole(user(["ROLE_ADMIN_DEANERY"]), ["ADMIN_DEANERY"])).toBe(true);
    expect(hasAnyRole(user(["ADMIN_PARISH"]), ["ADMIN_DEANERY", "ADMIN_PARISH"])).toBe(true);
  });

  it("is satisfied by any one role of an account that holds several", () => {
    expect(hasAnyRole(user(["ADMIN_DEANERY", "ADMIN_PARISH"]), ["ADMIN_PARISH"])).toBe(true);
    expect(hasAnyRole(user(["ADMIN_PARISH"]), ["ADMIN_DEANERY"])).toBe(false);
  });

  it("allows everyone when no role is required and nobody when signed out", () => {
    expect(hasAnyRole(null, undefined)).toBe(true);
    expect(hasAnyRole(null, ["ADMIN_PARISH"])).toBe(false);
  });
});
