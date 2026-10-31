import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() } }));

import { createMutationCache } from "@/lib/api/mutation-cache";

function client() {
  return new QueryClient({ mutationCache: createMutationCache() });
}

describe("createMutationCache", () => {
  beforeEach(() => toastError.mockReset());

  it("shows a shared error toast for a mutation without its own onError", async () => {
    const queryClient = client();
    const mutation = queryClient.getMutationCache().build(queryClient, { mutationFn: async () => Promise.reject(new Error("Không đủ quyền")) });

    await expect(mutation.execute(undefined)).rejects.toThrow("Không đủ quyền");

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0][0]).toContain("Không đủ quyền");
  });

  it("leaves the message to mutations that declare onError", async () => {
    const queryClient = client();
    const onError = vi.fn();
    const mutation = queryClient.getMutationCache().build(queryClient, { mutationFn: async () => Promise.reject(new Error("x")), onError });

    await expect(mutation.execute(undefined)).rejects.toThrow("x");

    expect(onError).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("skips the shared toast for mutations marked with meta.handlesError", async () => {
    const queryClient = client();
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => Promise.reject(new Error("x")),
      meta: { handlesError: true },
    });

    await expect(mutation.execute(undefined)).rejects.toThrow("x");

    expect(toastError).not.toHaveBeenCalled();
  });
});
