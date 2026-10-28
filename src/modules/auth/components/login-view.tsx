"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {Eye, EyeSlash, LockKey, User} from "@phosphor-icons/react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";
import {BRAND_NAME, BRAND_TAGLINE_EN, BRAND_TAGLINE_VI, BrandMark} from "@/components/brand/brand-mark";
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

const CLEAD_MEANINGS = [
    {letter: "C", title: "Catholic — Đức tin làm nền tảng", description: "lấy Đức Kitô làm trung tâm, tình yêu làm kim chỉ nam; xây dựng cộng đoàn Huynh trưởng hiệp nhất và trung thành với sứ mạng phục vụ."},
    {letter: "L", title: "Leadership — Lãnh đạo bằng tinh thần phục vụ", description: "người Huynh trưởng đồng hành, nêu gương và khơi dậy điều tốt đẹp nơi các em."},
    {letter: "E", title: "Education — Đào luyện để trưởng thành", description: "trưởng thành về nhân bản, đức tin và tinh thần trách nhiệm."},
    {letter: "A", title: "Administration — Quản trị trong tinh thần hiệp nhất", description: "kết nối Giáo phận, Giáo hạt, Giáo xứ; vận hành đồng bộ, minh bạch và hiệu quả."},
    {letter: "D", title: "Development — Phát triển để dấn thân", description: "vun đắp khả năng hôm nay thành đóng góp thiết thực cho Giáo hội ngày mai."},
] as const;

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
        <AuthShell maxWidth="max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
                <aside className="flex flex-col lg:border-r lg:border-border lg:pr-12">
                    <div className="flex items-center gap-4">
                        <BrandMark size={88}/>
                        <div>
                            <h1 className="text-3xl font-bold tracking-wide text-primary">{BRAND_NAME}</h1>
                            <p className="text-sm font-semibold text-foreground">{BRAND_TAGLINE_EN}</p>
                            <p className="text-sm text-muted">{BRAND_TAGLINE_VI}</p>
                        </div>
                    </div>
                    <p className="mt-5 text-sm leading-6 text-text-secondary">
                        Hệ thống không chỉ để quản lí, mà còn gửi gắm khát vọng đào luyện những người trẻ biết sống đức
                        tin, trưởng thành trong trách nhiệm và nhiệt thành phục vụ — dành cho người Huynh trưởng Thiếu
                        Nhi Thánh Thể.
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                        Catholic Leadership, Education, Administration and Development
                    </p>
                    <ul className="mt-3 space-y-3">
                        {CLEAD_MEANINGS.map((item) => (
                            <li className="flex gap-3" key={item.letter}>
                                <span
                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-bold text-primary">{item.letter}</span>
                                <p className="text-sm leading-5 text-text-secondary">
                                    <span className="font-semibold text-foreground">{item.title}</span>
                                    {" — "}{item.description}
                                </p>
                            </li>
                        ))}
                    </ul>
                </aside>

                <div className="flex flex-col justify-center">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-semibold text-foreground">Đăng nhập</h2>
                    <p className="mt-2 text-base text-muted">Chào mừng bạn đến với hệ thống {BRAND_NAME}</p>
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
                </div>
            </div>
        </AuthShell>
    );
}

// Chỉ cho quay lại đường dẫn nội bộ sau đăng nhập (chặn chuyển hướng ra ngoài).
function safeNextPath(next: string | null) {
    return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}
