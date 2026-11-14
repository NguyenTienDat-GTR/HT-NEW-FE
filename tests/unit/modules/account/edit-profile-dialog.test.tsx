import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { profileApi, type MyLeaderProfile } from "@/modules/account/account-api";
import { buildProfileChanges, EditProfileDialog, validateDraft } from "@/modules/account/components/edit-profile-dialog";
import { formatDate } from "@/modules/leaders/components/leader-detail-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const leader: MyLeaderProfile = {
  id: "l1",
  holyName: "Phêrô",
  fullName: "Nguyễn Văn An",
  birthDate: "1995-03-07",
  gender: "NAM",
  email: "an@example.com",
  phoneNumber: "0901234567",
  parishName: "Bà Lụa",
  deaneryName: "Thủ Dầu Một",
  imageUrl: null,
};

const draft = {
  holyName: "Phêrô",
  birthDate: "1995-03-07",
  gender: "NAM",
  email: "an@example.com",
  phoneNumber: "0901234567",
};
const noAvatar = { assetId: null };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("buildProfileChanges", () => {
  it("sends nothing when nothing changed, so the backend checks no duplicates", () => {
    expect(buildProfileChanges(leader, draft, noAvatar, "", true)).toEqual({});
    expect(buildProfileChanges(leader, draft, noAvatar, "", false)).toEqual({});
  });

  it("does not send email or phone when only other fields change", () => {
    const changes = buildProfileChanges(leader, { ...draft, holyName: "Phaolô" }, noAvatar, "", false);
    expect(changes).toEqual({ holyName: "Phaolô" });
  });

  it("sends only the phone when only the phone changes, without a password", () => {
    expect(buildProfileChanges(leader, { ...draft, phoneNumber: "0907654321" }, noAvatar, "", false)).toEqual({ phoneNumber: "0907654321" });
  });

  it("adds the current password only when the email changes", () => {
    expect(buildProfileChanges(leader, { ...draft, email: "moi@example.com" }, noAvatar, "mk", false)).toEqual({
      email: "moi@example.com",
      currentPassword: "mk",
    });
    expect(buildProfileChanges(leader, draft, noAvatar, "mk", false)).not.toHaveProperty("currentPassword");
  });

  it("sends the avatar id only for a replacement photo and never a removal", () => {
    expect(buildProfileChanges(leader, draft, { assetId: "a1" }, "", false)).toEqual({ imageAssetId: "a1" });
    expect(buildProfileChanges(leader, draft, noAvatar, "", false)).not.toHaveProperty("clearImage");
  });

  it("never includes the full name, parish or deanery", () => {
    const changes = buildProfileChanges(leader, { ...draft, holyName: "X" }, noAvatar, "", true);
    expect(Object.keys(changes).some((key) => /fullName|parish|deanery/i.test(key))).toBe(false);
  });

  it("sends the birth date only when the account may edit it", () => {
    const changed = { ...draft, birthDate: "1996-04-08" };
    expect(buildProfileChanges(leader, changed, noAvatar, "", true)).toEqual({ birthDate: "1996-04-08" });
    expect(buildProfileChanges(leader, changed, noAvatar, "", false)).toEqual({});
  });
});

describe("validateDraft", () => {
  it("accepts the current profile", () => {
    expect(validateDraft(draft, true)).toEqual({});
    expect(validateDraft(draft, false)).toEqual({});
  });

  it("requires a valid phone and email and, with the permission, a past birth date", () => {
    const errors = validateDraft({ ...draft, phoneNumber: "", email: "sai", birthDate: "2999-01-01", holyName: " " }, true);
    expect(Object.keys(errors).sort()).toEqual(["birthDate", "email", "holyName", "phoneNumber"]);
    expect(validateDraft({ ...draft, phoneNumber: "12345" }, true).phoneNumber).toContain("10 chữ số");
  });

  it("does not check the birth date when the account cannot edit it, so a missing one never blocks saving", () => {
    expect(validateDraft({ ...draft, birthDate: "" }, false)).toEqual({});
    expect(validateDraft({ ...draft, birthDate: "" }, true).birthDate).toBe("Vui lòng chọn ngày sinh");
  });
});

describe("EditProfileDialog", () => {
  function setup(canEditBirthDate = false) {
    const onClose = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <EditProfileDialog canEditBirthDate={canEditBirthDate} leader={leader} onClose={onClose} />
      </QueryClientProvider>,
    );
    return { onClose };
  }

  it("shows parish and deanery as read-only text and disables save until something changes", () => {
    setup();
    expect(screen.getByText("Bà Lụa")).toBeInTheDocument();
    expect(screen.getByText("Thủ Dầu Một")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Giáo xứ/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chưa có thay đổi" })).toBeDisabled();
  });

  it("offers the same editable fields as the leader profile edit, with the full name as read-only text", () => {
    setup();
    for (const label of ["Tên thánh", "Giới tính", "Email", "Số điện thoại"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText("Họ và tên")).not.toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
  });

  it("shows the birth date as read-only text when the account has no permission to edit it", () => {
    setup(false);
    expect(screen.queryByLabelText("Ngày sinh")).not.toBeInTheDocument();
    expect(screen.getByText(formatDate(leader.birthDate))).toBeInTheDocument();
    expect(screen.getByText(/Ngày sinh chỉ sửa được khi tài khoản có quyền sửa ngày sinh/)).toBeInTheDocument();
  });

  it("lets an account with the birth date permission change it and sends only that field", async () => {
    const update = vi.spyOn(profileApi, "update").mockResolvedValue({} as never);
    const { onClose } = setup(true);
    expect(screen.queryByText(/chỉ sửa được khi tài khoản có quyền sửa ngày sinh/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ngày sinh"), { target: { value: "1996-04-08" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ birthDate: "1996-04-08", privacyConsent: true }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("offers no way to remove the avatar", () => {
    setup();
    expect(screen.queryByRole("button", { name: /Xóa ảnh/ })).not.toBeInTheDocument();
    expect(screen.getByText(/không xóa được/)).toBeInTheDocument();
  });

  it("saves a phone-only change without asking for a password", async () => {
    const update = vi.spyOn(profileApi, "update").mockResolvedValue({} as never);
    const { onClose } = setup();
    expect(screen.queryByLabelText("Mật khẩu hiện tại")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0907654321" } });
    expect(screen.queryByLabelText("Mật khẩu hiện tại")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ phoneNumber: "0907654321", privacyConsent: true }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("asks for the current password when the email changes and blocks saving without it", async () => {
    const update = vi.spyOn(profileApi, "update").mockResolvedValue({} as never);
    setup();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "moi@example.com" } });
    expect(await screen.findByLabelText("Mật khẩu hiện tại")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText("Vui lòng nhập mật khẩu hiện tại để đổi email")).toBeInTheDocument();
  });

  it("does not tick the consent box by default and refuses to save until it is ticked", async () => {
    const update = vi.spyOn(profileApi, "update").mockResolvedValue({} as never);
    setup();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0907654321" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(update).not.toHaveBeenCalled();
    expect(await screen.findByText("Vui lòng tích đồng ý để lưu thay đổi")).toBeInTheDocument();
  });

  it("shows the server message when the phone is already used", async () => {
    vi.spyOn(profileApi, "update").mockRejectedValue(new Error("Số điện thoại Huynh Trưởng đã tồn tại"));
    const { onClose } = setup();
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0907654321" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(await screen.findByText("Số điện thoại Huynh Trưởng đã tồn tại")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
