import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { apiFetch } from "./client";

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("refreshes once and retries a protected request", async () => {
    useAuthStore.getState().setAccessToken("old-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: "Hết hạn" }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { accessToken: "new-token", user: { username: "admin", roles: [], permissions: [] } },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { ok: true } })));

    await expect(apiFetch<{ ok: boolean }>("/protected")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe("new-token");
  });

  it("rejects envelope errors with the server message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng", errorCode: "INVALID_LOGIN" }), {
        status: 400,
      }),
    );

    await expect(apiFetch<null>("/auth/login", { method: "POST" })).rejects.toMatchObject({
      message: "Tên đăng nhập hoặc mật khẩu không đúng",
      status: 400,
      errorCode: "INVALID_LOGIN",
    });
  });
});
