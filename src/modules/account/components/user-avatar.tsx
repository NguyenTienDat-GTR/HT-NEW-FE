import { AvatarLightbox } from "@/components/common/avatar-lightbox";
import { MediaImage } from "@/components/common/media-image";
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
  zoomable = false,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof sizes;
  showStatus?: boolean;
  // Bấm vào khung avatar để xem ảnh lớn.
  zoomable?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex w-fit shrink-0", className)}>
      {zoomable ? (
        <AvatarLightbox name={name} src={imageUrl}>
        <MediaImage
          alt=""
          className={cn("block rounded-full ring-2 ring-white", sizes[size])}
          fallback={
            <span
              aria-hidden
              className={cn(
                "grid place-items-center rounded-full bg-gradient-to-br from-primary to-[#2563eb] font-semibold tracking-wide text-white ring-2 ring-white",
                sizes[size],
              )}
            >
              {initials(name)}
            </span>
          }
          src={imageUrl}
        />
        </AvatarLightbox>
      ) : (
      <MediaImage
        alt=""
        className={cn("block rounded-full ring-2 ring-white", sizes[size])}
        fallback={
          <span
            aria-hidden
            className={cn(
              "grid place-items-center rounded-full bg-gradient-to-br from-primary to-[#2563eb] font-semibold tracking-wide text-white ring-2 ring-white",
              sizes[size],
            )}
          >
            {initials(name)}
          </span>
        }
        src={imageUrl}
      />
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
