import Image from "next/image";
import {cn} from "@/lib/utils";

export const BRAND_NAME = "C-LEAD";
export const BRAND_TAGLINE_EN = "Forming Leaders, Serving Christ";
export const BRAND_TAGLINE_VI = "Đào luyện người Huynh Trưởng, phụng sự Đức Kitô.";

export function BrandMark({className, size = 44}: { className?: string; size?: number }) {
    return (
        <span className={cn("inline-flex shrink-0 items-center", className)}>
            <Image
                alt="Logo C-LEAD"
                className="shrink-0 object-contain"
                height={size}
                priority
                src="/brand/c-lead.png"
                style={{height: size, width: size}}
                width={size}
            />
        </span>
    );
}
