import { cn } from "@/lib/utils";

/** Phiên bản hệ thống, đặt lúc build từ package.json (BE và FE cùng một số phiên bản). */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/** Nhãn "Phiên bản 1.0.0". */
export function AppVersion({ className }: { className?: string }) {
  return (
    <p className={cn("whitespace-nowrap tabular-nums", className)} title="Phiên bản hệ thống">
      Phiên bản {APP_VERSION}
    </p>
  );
}
