"use client";

import { Camera, PencilSimple, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AvatarUploadDialog } from "@/components/common/avatar-upload-dialog";
import { MediaImage } from "@/components/common/media-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/client";
import { myProfileQueryKey, profileApi, type MyLeaderProfile, type MyProfileUpdate } from "../account-api";
import { FormError } from "./change-password-steps";
import { PasswordField } from "./password-field";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0\d{9}$/;

type Draft = {
  holyName: string;
  fullName: string;
  birthDate: string;
  gender: string;
  email: string;
  phoneNumber: string;
};

function draftFrom(leader: MyLeaderProfile): Draft {
  return {
    holyName: leader.holyName ?? "",
    fullName: leader.fullName ?? "",
    birthDate: leader.birthDate ?? "",
    gender: leader.gender ?? "",
    email: leader.email ?? "",
    phoneNumber: leader.phoneNumber ?? "",
  };
}

export function validateDraft(draft: Draft, today = new Date().toISOString().slice(0, 10)) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!draft.holyName.trim()) errors.holyName = "Vui lòng nhập tên thánh";
  if (!draft.fullName.trim()) errors.fullName = "Vui lòng nhập họ và tên";
  if (!draft.birthDate) errors.birthDate = "Vui lòng chọn ngày sinh";
  else if (draft.birthDate >= today) errors.birthDate = "Ngày sinh phải là một ngày trong quá khứ";
  if (!draft.gender) errors.gender = "Vui lòng chọn giới tính";
  if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = "Email không hợp lệ";
  if (!draft.phoneNumber.trim()) errors.phoneNumber = "Số điện thoại là bắt buộc";
  else if (!PHONE_PATTERN.test(draft.phoneNumber.trim())) errors.phoneNumber = "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0";
  return errors;
}

/** Chỉ gửi các trường thật sự đổi: backend chỉ kiểm tra trùng email / số điện thoại khi hai giá trị này đổi. */
export function buildProfileChanges(
  leader: MyLeaderProfile,
  draft: Draft,
  avatar: { assetId: string | null },
  currentPassword: string,
): MyProfileUpdate {
  const original = draftFrom(leader);
  const changes: MyProfileUpdate = {};
  const text = (key: "holyName" | "fullName" | "email" | "phoneNumber") => {
    const value = draft[key].trim();
    if (value !== original[key].trim()) changes[key] = value;
  };
  text("holyName");
  text("fullName");
  text("email");
  text("phoneNumber");
  if (draft.birthDate !== original.birthDate) changes.birthDate = draft.birthDate;
  if (draft.gender !== original.gender) changes.gender = draft.gender;
  if (avatar.assetId) changes.imageAssetId = avatar.assetId;
  if (changes.email) changes.currentPassword = currentPassword;
  return changes;
}

/** Tự sửa thông tin cá nhân. Giáo xứ / giáo hạt chỉ xem: do quản trị viên điều chuyển. */
export function EditProfileDialog({ leader, onClose }: { leader: MyLeaderProfile; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(leader));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(leader.imageUrl ?? null);
  const [avatar, setAvatar] = useState<{ assetId: string | null }>({ assetId: null });
  const [avatarDialog, setAvatarDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const errors = validateDraft(draft);
  const changes = buildProfileChanges(leader, draft, avatar, password);
  const emailChanging = Boolean(changes.email);
  const hasChanges = Object.keys(changes).filter((key) => key !== "currentPassword").length > 0;
  const needsPassword = emailChanging && !password;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setShowErrors(true);
    if (Object.keys(errors).length || !hasChanges || needsPassword) return;
    setPending(true);
    setError(null);
    try {
      await profileApi.update(changes);
      await queryClient.invalidateQueries({ queryKey: myProfileQueryKey });
      toast.success("Đã cập nhật hồ sơ cá nhân");
      onClose();
    } catch (exception) {
      setError(getApiErrorMessage(exception));
    } finally {
      setPending(false);
    }
  }

  const fieldError = (key: keyof Draft) => (showErrors ? errors[key] : undefined);

  return (
    <Dialog.Root onOpenChange={(open) => !open && !pending && onClose()} open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl focus:outline-none sm:p-6"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <PencilSimple aria-hidden className="h-5 w-5" weight="bold" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">Chỉnh sửa hồ sơ cá nhân</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm leading-5 text-text-secondary">
                  Giáo xứ và giáo hạt do quản trị viên điều chuyển nên không sửa ở đây.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" disabled={pending} size="icon" variant="ghost">
                <X className="h-[18px] w-[18px]" />
              </Button>
            </Dialog.Close>
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="flex items-center gap-4">
              <MediaImage
                alt="Ảnh đại diện"
                className="block h-20 w-20 rounded-full border border-border"
                fallback={
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2 text-muted">
                    <Camera size={28} weight="duotone" />
                  </span>
                }
                src={avatarUrl}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAvatarDialog(true)} size="sm" type="button" variant="outline">
                  {avatarUrl ? "Đổi ảnh" : "Chọn ảnh"}
                </Button>
                <p className="w-full text-xs text-muted">Ảnh đại diện chỉ có thể thay bằng ảnh khác, không xóa được.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField error={fieldError("holyName")} id="profile-holy-name" label="Tên thánh" maxLength={50} onChange={(v) => set("holyName", v)} value={draft.holyName} />
              <TextField error={fieldError("fullName")} id="profile-full-name" label="Họ và tên" maxLength={200} onChange={(v) => set("fullName", v)} value={draft.fullName} />
              <TextField error={fieldError("birthDate")} id="profile-birth-date" label="Ngày sinh" onChange={(v) => set("birthDate", v)} type="date" value={draft.birthDate} />
              <div>
                <label className="block text-sm font-semibold text-foreground" htmlFor="profile-gender">
                  Giới tính
                </label>
                <select
                  aria-invalid={Boolean(fieldError("gender"))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-input bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]"
                  id="profile-gender"
                  onChange={(event) => set("gender", event.target.value)}
                  value={draft.gender}
                >
                  <option value="">Chọn</option>
                  <option value="NAM">Nam</option>
                  <option value="NU">Nữ</option>
                </select>
                {fieldError("gender") ? <p className="mt-1 text-xs text-danger">{fieldError("gender")}</p> : null}
              </div>
              <TextField error={fieldError("email")} id="profile-email" label="Email" maxLength={100} onChange={(v) => set("email", v)} type="email" value={draft.email} />
              <TextField error={fieldError("phoneNumber")} id="profile-phone" label="Số điện thoại" maxLength={10} onChange={(v) => set("phoneNumber", v)} value={draft.phoneNumber} />
            </div>

            <dl className="grid gap-3 rounded-lg bg-surface-1 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Giáo xứ / giáo họ / giáo điểm</dt>
                <dd className="font-medium text-foreground">{leader.parishName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Giáo hạt</dt>
                <dd className="font-medium text-foreground">{leader.deaneryName ?? "—"}</dd>
              </div>
            </dl>

            {emailChanging ? (
              <div className="space-y-1">
                <PasswordField autoComplete="current-password" label="Mật khẩu hiện tại" onChange={setPassword} value={password} />
                <p className="text-xs text-text-secondary">Email này nhận mã OTP khi đổi hoặc quên mật khẩu nên cần xác nhận bằng mật khẩu.</p>
                {showErrors && needsPassword ? <p className="text-xs text-danger">Vui lòng nhập mật khẩu hiện tại để đổi email</p> : null}
              </div>
            ) : null}

            <FormError message={error} />
            <div className="flex justify-end gap-2">
              <Button disabled={pending} onClick={onClose} type="button" variant="outline">
                Hủy
              </Button>
              <Button disabled={!hasChanges} loading={pending} type="submit">
                {hasChanges ? "Lưu thay đổi" : "Chưa có thay đổi"}
              </Button>
            </div>
          </form>

          <AvatarUploadDialog
            currentUrl={avatarUrl}
            onOpenChange={setAvatarDialog}
            onUploaded={(result) => {
              setAvatarUrl(result.url);
              setAvatar({ assetId: result.assetId });
            }}
            open={avatarDialog}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground" htmlFor={id}>
        {label}
      </label>
      <Input
        aria-invalid={Boolean(error)}
        className="mt-1.5 h-11"
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
