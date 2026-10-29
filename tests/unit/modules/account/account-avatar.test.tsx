import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/auth-store";
import { avatarApi, type MyProfile } from "@/modules/account/account-api";
import { MyProfilePage } from "@/modules/account/components/my-profile-page";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/common/avatar-upload-dialog", () => ({
  AvatarUploadDialog: ({ open, category, onUploaded }: { open: boolean; category?: string; onUploaded: (r: { assetId: string }) => void }) =>
    open ? <button data-category={category} onClick={() => onUploaded({ assetId: "asset-9" })} type="button">giả lập tải ảnh xong</button> : null,
}));

const base: MyProfile = { username: "adminsaigon", roles: [], email: "a@x.vn", hasLeader: false, leader: null, rankHistory: [], certificates: [] };

function renderPage(profile: MyProfile) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["auth", "me", "profile", profile.username], profile);
  return render(
    <QueryClientProvider client={client}>
      <MyProfilePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ user: { username: "adminsaigon", roles: [], permissions: [] } as never });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("avatar of accounts without a leader", () => {
  it("offers to add an avatar and saves the uploaded asset", async () => {
    const update = vi.spyOn(avatarApi, "update").mockResolvedValue({ ...base, imageUrl: "/api/media/x" });
    renderPage(base);
    fireEvent.click(screen.getByRole("button", { name: /Thêm ảnh đại diện/ }));
    const done = screen.getByRole("button", { name: "giả lập tải ảnh xong" });
    expect(done).toHaveAttribute("data-category", "ACCOUNT_AVATAR");
    fireEvent.click(done);
    await waitFor(() => expect(update).toHaveBeenCalledWith("asset-9"));
  });

  it("says 'change' when an avatar already exists", () => {
    renderPage({ ...base, imageUrl: "/api/media/x/medium?sig=a" });
    expect(screen.getByRole("button", { name: /Đổi ảnh đại diện/ })).toBeInTheDocument();
  });

  it("does not show the button for accounts linked to a leader (they edit the leader profile)", () => {
    renderPage({ ...base, hasLeader: true, leader: { id: "l1", fullName: "An" } });
    expect(screen.queryByRole("button", { name: /ảnh đại diện/ })).toBeNull();
  });
});
