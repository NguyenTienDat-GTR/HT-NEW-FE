import { describe, expect, it } from "vitest";
import { displayName, initials, primaryRoleName, roleLabel } from "@/modules/account/account-display";

describe("account display helpers", () => {
  it("maps role codes to Vietnamese labels", () => {
    expect(roleLabel("ADMIN_DIOCESE")).toBe("Admin Liên đoàn");
    expect(roleLabel("ROLE_SUPER_ADMIN")).toBe("Quản trị viên");
  });

  it("prefers the primary role name from the profile", () => {
    const roles = [
      { code: "LD_TRUONG", name: "Liên đoàn trưởng", primary: false },
      { code: "ADMIN_PARISH", name: "Admin Xứ đoàn", primary: true },
    ];
    expect(primaryRoleName(roles, ["LD_TRUONG"])).toBe("Admin Xứ đoàn");
    expect(primaryRoleName(undefined, ["ADMIN_DIOCESE"])).toBe("Admin Liên đoàn");
  });

  it("uses holy name and full name when the account has a leader", () => {
    const profile = {
      username: "giuse.nguyen",
      roles: [],
      email: null,
      rankHistory: [],
      certificates: [],
      hasLeader: true,
      leader: { id: "1", holyName: "Giuse", fullName: "Nguyễn Văn An" },
    };
    expect(displayName(profile, "fallback")).toBe("Giuse Nguyễn Văn An");
  });

  it("falls back to the username for accounts without a leader", () => {
    const profile = { username: "adminsaigon", roles: [], email: null, hasLeader: false, leader: null, rankHistory: [], certificates: [] };
    expect(displayName(profile, "fallback")).toBe("adminsaigon");
  });

  it("builds two-letter initials from the last two words", () => {
    expect(initials("Nguyễn Văn An")).toBe("VA");
    expect(initials("admin")).toBe("AD");
  });
});
