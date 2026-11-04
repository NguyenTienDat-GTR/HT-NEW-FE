import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { PrivacyConsentGate } from "@/modules/privacy/components/privacy-consent-gate";
import { privacyApi, type PrivacyConsentStatus } from "@/modules/privacy/privacy-api";

const consented: PrivacyConsentStatus = { policyVersion: "1.0", consented: true, consentedVersion: "1.0", consentedAt: "2026-11-04T10:00:00Z" };
const notConsented: PrivacyConsentStatus = { policyVersion: "1.0", consented: false, consentedVersion: null, consentedAt: null };

function renderGate(initial?: PrivacyConsentStatus) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (initial) client.setQueryData(["auth", "me", "privacy-consent", "an"], initial);
  render(
    <QueryClientProvider client={client}>
      <PrivacyConsentGate />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.getState().setUser({ username: "an", roles: [], permissions: [] } as never);
  // Dữ liệu đã nạp sẵn nên thường không gọi mạng; nếu có gọi thì trả trạng thái chưa đồng ý.
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: notConsented }), { status: 200 }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.getState().clear();
});

describe("PrivacyConsentGate", () => {
  it("renders nothing when the user already agreed to the current policy", () => {
    renderGate(consented);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("blocks with a dialog when consent is missing and refuses to continue until ticked", async () => {
    const accept = vi.spyOn(privacyApi, "accept").mockResolvedValue(consented);
    renderGate(notConsented);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Đồng ý và tiếp tục" }));
    expect(accept).not.toHaveBeenCalled();
    expect(await screen.findByText("Vui lòng tích đồng ý để tiếp tục")).toBeInTheDocument();
  });

  it("records consent once the box is ticked and closes the dialog", async () => {
    const accept = vi.spyOn(privacyApi, "accept").mockResolvedValue(consented);
    renderGate(notConsented);
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý và tiếp tục" }));
    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("asks to confirm again when the policy changed since the last consent", async () => {
    renderGate({ ...notConsented, consentedVersion: "0.9" });
    expect(await screen.findByText(/cần xác nhận lại/)).toBeInTheDocument();
  });
});
