"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Key, LockKey } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự").max(72, "Mật khẩu mới tối đa 72 ký tự"),
  })
  .refine((value) => value.oldPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "Mật khẩu mới phải khác mật khẩu cũ",
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function ChangePasswordView() {
  const router = useRouter();
  const clear = useAuthStore((state) => state.clear);
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "" },
  });

  async function onSubmit(values: ChangePasswordForm) {
    try {
      await apiMutation<null>("/auth/change-password", "POST", values);
      clear();
      toast.success("Đổi mật khẩu thành công, vui lòng đăng nhập lại");
      router.replace("/login");
    } catch (error) {
      const message = getApiErrorMessage(error);
      form.setError("root", { message });
    }
  }

  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-app-canvas px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,oklch(0.72_0.12_185_/_0.12),transparent_34%),linear-gradient(180deg,var(--background)_0%,var(--primary-soft)_100%)]" />
      <section className="relative m-auto w-full max-w-140 rounded-[18px] border border-white/80 bg-white/90 p-8 shadow-[var(--shadow-elevated)] backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="justify-center" />
          <span className="mt-6 grid h-12 w-12 place-items-center rounded-[14px] bg-primary/10 text-primary">
            <Key size={24} weight="bold" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-normal text-foreground">Đổi mật khẩu</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Hoàn tất bước bảo mật trước khi vào hệ thống.</p>
        </div>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block text-sm font-semibold text-foreground">
            Mật khẩu hiện tại
            <span className="relative mt-2 block">
              <LockKey className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input className="h-13 rounded-xl pl-12" type="password" {...form.register("oldPassword")} />
            </span>
            <span className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.oldPassword?.message}</span>
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Mật khẩu mới
            <span className="relative mt-2 block">
              <LockKey className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input className="h-13 rounded-xl pl-12" type="password" {...form.register("newPassword")} />
            </span>
            <span className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.newPassword?.message}</span>
          </label>
          <p className="min-h-5 text-sm text-danger" role="alert">
            {form.formState.errors.root?.message}
          </p>
          <Button className="h-13 w-full rounded-xl text-base" loading={form.formState.isSubmitting} type="submit">
            Cập nhật mật khẩu
          </Button>
        </form>
      </section>
    </main>
  );
}
