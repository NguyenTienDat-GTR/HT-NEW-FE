import { describe, expect, it } from "vitest";
import { passwordStrength } from "@/modules/account/password-strength";

describe("passwordStrength", () => {
  it("rates short or simple passwords as weak", () => {
    expect(passwordStrength("abc12").label).toBe("Yếu");
    expect(passwordStrength("abcdefgh").label).toBe("Yếu");
  });

  it("rates passwords missing a character kind as medium", () => {
    expect(passwordStrength("Abcdefg12").label).toBe("Trung bình");
  });

  it("rates passwords with upper, lower, digit and special characters as strong", () => {
    expect(passwordStrength("Abc123!x").label).toBe("Mạnh");
  });
});
