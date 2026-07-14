"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Church, Eye, LockKey, User } from "@phosphor-icons/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";

const loginSchema = z.object({
  username: z.string().min(1, "Nhập tài khoản"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginResponse = {
  accessToken: string;
  tokenType: string;
  accessTokenExpiresInMs: number;
  user: AuthUser;
};

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    try {
      const data = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
      toast.success("Đăng nhập thành công");
      const next = data.user.mustChangePassword ? "/change-password" : (searchParams.get("next") ?? "/dashboard");
      router.replace(next as Route);
    } catch (error) {
      const message = getApiErrorMessage(error);
      form.setError("root", { message });
      toast.error(message);
    }
  }

  return (
    <main className="relative grid min-h-[100dvh] overflow-hidden bg-[#f7f8ff] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgb(108_71_255_/_0.10),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f4f3ff_100%)]" />
      <Church className="absolute bottom-22 right-[7vw] h-72 w-72 text-primary/10" weight="fill" />
      <div className="absolute -bottom-12 left-0 h-40 w-[45vw] rounded-tr-[100%] bg-primary/8" />
      <div className="absolute bottom-0 right-0 h-36 w-[48vw] rounded-tl-[100%] bg-primary/6" />

      <section className="relative m-auto w-full max-w-[620px] rounded-[18px] border border-white/80 bg-white/88 p-8 shadow-[0_24px_80px_rgb(31_35_48_/_0.14)] backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="justify-center" />
          <h1 className="mt-6 text-2xl font-semibold tracking-[0] text-foreground">HT Management</h1>
          <p className="mt-2 text-base text-muted">Hệ thống quản lí Huynh trưởng</p>
          <p className="mt-1 text-sm text-muted">Thống nhất để phục vụ</p>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block text-sm font-semibold text-foreground">
            Tài khoản
            <span className="relative mt-2 block">
              <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input className="h-13 rounded-[12px] pl-12" autoComplete="username" placeholder="Nhập tên đăng nhập hoặc tài khoản" {...form.register("username")} />
            </span>
            <span className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.username?.message}</span>
          </label>

          <label className="block text-sm font-semibold text-foreground">
            Mật khẩu
            <span className="relative mt-2 block">
              <LockKey className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input className="h-13 rounded-[12px] pl-12 pr-12" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" {...form.register("password")} />
              <Eye className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            </span>
            <span className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.password?.message}</span>
          </label>

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-muted">
              <input className="h-4 w-4 rounded border-border accent-primary" type="checkbox" />
              Ghi nhớ đăng nhập
            </label>
            <span className="font-semibold text-primary">Quên mật khẩu?</span>
          </div>

          <p className="min-h-5 text-sm text-danger" role="alert">
            {form.formState.errors.root?.message}
          </p>

          <Button className="h-13 w-full rounded-[12px] text-base" loading={form.formState.isSubmitting} type="submit">
            Đăng nhập
          </Button>
        </form>
      </section>
    </main>
  );
}
