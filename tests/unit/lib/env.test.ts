import { describe, expect, it } from "vitest";
import { clientEnv, serverEnv } from "@/lib/env";

describe("env validation", () => {
  it("exposes only the public websocket URL to client env", () => {
    expect(serverEnv.BACKEND_ORIGIN).toMatch(/^http/);
    expect(clientEnv.NEXT_PUBLIC_WS_URL).toMatch(/^ws/);
    expect("BACKEND_ORIGIN" in clientEnv).toBe(false);
  });
});
