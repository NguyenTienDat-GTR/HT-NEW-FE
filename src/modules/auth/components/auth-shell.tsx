import { Church } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/** Khung nền và thẻ giữa trang dùng chung cho các màn đăng nhập, quên mật khẩu. */
export function AuthShell({ children, maxWidth = "max-w-155" }: { children: ReactNode; maxWidth?: string }) {
  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-app-canvas px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,var(--background)_0%,var(--primary-soft)_100%)]" />
      <Church className="absolute bottom-22 right-[7vw] h-72 w-72 text-primary/10" weight="fill" />
      <div className="absolute -bottom-12 left-0 h-40 w-[45vw] rounded-tr-[100%] bg-primary/8" />
      <div className="absolute bottom-0 right-0 h-36 w-[48vw] rounded-tl-[100%] bg-primary/6" />

      <section
        className={`relative m-auto w-full ${maxWidth} rounded-[18px] border border-white/80 bg-white/88 p-8 shadow-(--shadow-elevated) backdrop-blur-xl sm:p-10`}
      >
        {children}
      </section>
    </main>
  );
}
