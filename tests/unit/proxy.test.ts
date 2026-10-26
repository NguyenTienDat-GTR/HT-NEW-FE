import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

// Next.js áp matcher lên đường dẫn; mẫu này là regex hợp lệ nên kiểm tra trực tiếp được.
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher", () => {
  it.each(["/login", "/forgot-password", "/change-password", "/_next/static/chunk.js", "/backend/api/auth/login"])(
    "leaves %s reachable without a session cookie",
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );

  it.each(["/", "/dashboard", "/system/accounts", "/training/courses"])("guards %s with the session cookie check", (path) => {
    expect(matcher.test(path)).toBe(true);
  });
});
