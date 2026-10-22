import { cn } from "@/lib/utils";
import { initials } from "../account-display";

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

export function UserAvatar({
  name,
  imageUrl,
  size = "sm",
  showStatus = false,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof sizes;
  showStatus?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex w-fit shrink-0", className)}>
      {imageUrl ? (
        <span
          aria-hidden
          className={cn("block rounded-full bg-cover bg-center ring-2 ring-white", sizes[size])}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "grid place-items-center rounded-full bg-gradient-to-br from-primary to-[#2563eb] font-semibold tracking-wide text-white ring-2 ring-white",
            sizes[size],
          )}
        >
          {initials(name)}
        </span>
      )}
      {showStatus ? (
        <span
          aria-hidden
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[var(--status-active)] ring-2 ring-white"
        />
      ) : null}
    </span>
  );
}
