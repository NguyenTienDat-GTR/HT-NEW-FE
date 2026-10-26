"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {Eye, EyeSlash, LockKey, User} from "@phosphor-icons/react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";
import {BrandMark} from "@/components/brand/brand-mark";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {apiFetch, getApiErrorMessage} from "@/lib/api/client";
import {useAuthStore, type AuthUser} from "@/lib/auth/auth-store";
import {AuthShell} from "./auth-shell";
import {useState} from "react";

const loginSchema = z.object({
    username: z.string().min(1, "Nhập tài khoản"),
    password: z.string().min(1, "Nhập mật khẩu"),
    // Ghi nhớ đăng nhập: BE giữ phiên lâu hơn (7 ngày không hoạt động, tối đa 30 ngày) và lưu cookie refresh.
    rememberMe: z.boolean(),
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginResponse = {
    accessToken: string;
    tokenType: string;
    accessTokenExpiresInMs: number;
    user: AuthUser;
};

export function LoginView() {
    const searchParams = useSearchParams();
    const setAccessToken = useAuthStore((state) => state.setAccessToken);
    const setUser = useAuthStore((state) => state.setUser);
    const form = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: {username: "", password: "", rememberMe: false},
    });
    const [showPassword, setShowPassword] = useState(false);

    async function onSubmit(values: LoginForm) {
        try {
            const data = await apiFetch<LoginResponse>("/auth/login", {
                method: "POST",
                body: JSON.stringify(values),
            });
            setAccessToken(data.accessToken);
            setUser(data.user);
            toast.success("Đăng nhập thành công");
            const next = data.user.mustChangePassword ? "/change-password" : safeNextPath(searchParams.get("next"));
            // Điều hướng cứng: router.replace giữ Router Cache của layout dashboard đã render cho tài khoản trước,
            // nên đăng nhập tài khoản B vẫn thấy tài khoản A. Tải lại trang để server đọc lại cookie phiên mới.
            window.location.assign(next);
        } catch (error) {
            const message = getApiErrorMessage(error);
            form.setError("root", {message});
            toast.error(message);
        }
    }

    function handleShowPassword() {
        setShowPassword(!showPassword);
    }

    return (
        <AuthShell>
                <div className="mb-8 flex flex-col items-center text-center">
                    <BrandMark className="justify-center"/>
                    <h1 className="mt-6 text-2xl font-semibold tracking-normal text-primary  uppercase">Hệ thống quản
                        lí Huynh trưởng</h1>
                    <p className="mt-2 text-base text-muted">Phục vụ trong yêu thương</p>
                </div>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <label className="block text-sm font-semibold text-foreground">
                        Tài khoản
                        <span className="relative mt-2 block">
                                <User
                                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"/>
                                <Input className="h-13 rounded-xl pl-12" autoComplete="username"
                                       placeholder="Nhập tên đăng nhập" {...form.register("username")} />
                            </span>
                        <span
                            className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.username?.message}
                            </span>
                    </label>

                    <label className="block text-sm font-semibold text-foreground">
                        Mật khẩu

                        <span className="relative mt-2 block">
                        <LockKey
                            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"/>

                        <Input className="h-13 rounded-xl pl-12 pr-12"
                               type={showPassword ? "text" : "password"}
                               placeholder="Nhập mật khẩu"
                               {...form.register("password")}
                        />

                        <button type="button" onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-muted/10 hover:text-foreground"
                                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                            {showPassword ? (
                                <EyeSlash className="h-5 w-5" weight="regular"/>
                            ) : (
                                <Eye className="h-5 w-5" weight="regular"/>
                            )}
                        </button>
                        </span>
                        <span
                            className="mt-1 block min-h-5 text-xs text-danger">{form.formState.errors.password?.message}</span>
                    </label>

                    <div className="flex items-center justify-between gap-3 text-sm">
                        <label className="inline-flex items-center gap-2 text-muted">
                            <input className="h-4 w-4 rounded border-border accent-primary" type="checkbox"
                                   {...form.register("rememberMe")}/>
                            Ghi nhớ đăng nhập
                        </label>
                        <Link className="font-semibold text-primary hover:underline" href="/forgot-password">Quên mật
                            khẩu?</Link>
                    </div>

                    <p className="min-h-5 text-sm text-danger" role="alert">
                        {form.formState.errors.root?.message}
                    </p>

                    <Button className="h-13 w-full rounded-xl text-base" loading={form.formState.isSubmitting}
                            type="submit">
                        Đăng nhập
                    </Button>
                </form>
        </AuthShell>
    );
}

// Chỉ cho quay lại đường dẫn nội bộ sau đăng nhập (chặn chuyển hướng ra ngoài).
function safeNextPath(next: string | null) {
    return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}
