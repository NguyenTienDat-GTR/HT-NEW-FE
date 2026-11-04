import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { PolicySections } from "@/modules/privacy/components/policy-sections";
import { PRIVACY_POLICY_LINK_LABEL, PRIVACY_POLICY_UPDATED_AT, PRIVACY_POLICY_VERSION } from "@/modules/privacy/constants";

export const metadata: Metadata = {
  title: `${PRIVACY_POLICY_LINK_LABEL} | C-LEAD`,
};

// Cùng tên cookie với proxy.ts: có một trong hai là đang có phiên đăng nhập.
const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE_NAME ?? "accessToken";
const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE_NAME ?? "refreshToken";

// Trang công khai: xem được khi chưa đăng nhập (proxy.ts loại trừ đường dẫn này khỏi kiểm tra cookie phiên).
// Đã đăng nhập (thường mở từ liên kết ở tab mới nên không còn trạng thái trong bộ nhớ) thì nút quay lại đưa về hệ thống, không về trang đăng nhập.
export default async function PrivacyPolicyPage() {
  const cookieStore = await cookies();
  const signedIn = cookieStore.has(REFRESH_COOKIE) || cookieStore.has(ACCESS_COOKIE);

  return (
    <main className="min-h-dvh bg-app-canvas px-4 py-8 sm:py-12">
      <article className="mx-auto max-w-3xl space-y-8 rounded-[18px] border border-border bg-white p-6 shadow-(--shadow-elevated) sm:p-10">
        <header className="space-y-3">
          <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline" href={signedIn ? "/dashboard" : "/login"}>
            <ArrowLeft aria-hidden className="h-4 w-4" weight="bold" />
            {signedIn ? "Về hệ thống" : "Về trang đăng nhập"}
          </Link>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{PRIVACY_POLICY_LINK_LABEL}</h1>
          <p className="text-sm text-text-secondary">
            Cập nhật lần cuối: {PRIVACY_POLICY_UPDATED_AT} · Phiên bản {PRIVACY_POLICY_VERSION}
          </p>
        </header>
        <PolicySections />
      </article>
    </main>
  );
}
