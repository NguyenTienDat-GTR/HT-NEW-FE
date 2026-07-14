"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Key } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
    <main className="grid min-h-[100dvh] place-items-center bg-surface-1 px-4 py-10">
      <section className="w-full max-w-[480px] rounded-[12px] border border-border bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-primary text-white">
            <Key size={24} weight="bold" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-[0]">Đổi mật khẩu</h1>
            <p className="text-sm text-muted">Hoàn tất bước bảo mật trước khi vào hệ thống</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium">
            Mật khẩu hiện tại
            <Input className="mt-2" type="password" {...form.register("oldPassword")} />
            <span className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.oldPassword?.message}</span>
          </label>
          <label className="block text-sm font-medium">
            Mật khẩu mới
            <Input className="mt-2" type="password" {...form.register("newPassword")} />
            <span className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.newPassword?.message}</span>
          </label>
          <p className="min-h-5 text-sm text-danger" role="alert">
            {form.formState.errors.root?.message}
          </p>
          <Button className="w-full" loading={form.formState.isSubmitting} type="submit">
            Cập nhật mật khẩu
          </Button>
        </form>
      </section>
    </main>
  );
}
