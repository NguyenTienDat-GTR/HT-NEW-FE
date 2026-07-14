"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "@phosphor-icons/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
    <main className="grid min-h-dvh place-items-center bg-surface-1 px-4 py-10">
      <section className="w-full max-w-120 rounded-xl border border-border bg-white p-6 shadow-(--shadow-card)">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-primary text-white">
            <ShieldCheck size={24} weight="bold" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-normal text-foreground">HT Management</h1>
            <p className="text-sm text-muted">Đăng nhập hệ thống quản lí huynh trưởng</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium">
            Tài khoản
            <Input className="mt-2" autoComplete="username" {...form.register("username")} />
            <span className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.username?.message}</span>
          </label>
          <label className="block text-sm font-medium">
            Mật khẩu
            <Input className="mt-2" type="password" autoComplete="current-password" {...form.register("password")} />
            <span className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.password?.message}</span>
          </label>
          <p className="min-h-5 text-sm text-danger" role="alert">
            {form.formState.errors.root?.message}
          </p>
          <Button className="w-full" loading={form.formState.isSubmitting} type="submit">
            Đăng nhập
          </Button>
        </form>
      </section>
    </main>
  );
}
