import {CrossIcon, CrownCross} from "@phosphor-icons/react";
import {cn} from "@/lib/utils";

export function BrandMark({className, compact = false}: { className?: string; compact?: boolean }) {
    return (
        <span className={cn("inline-flex items-center gap-3", className)}>
      <span
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-primary text-white shadow-(--shadow-accent)">
        <span className="absolute inset-0.75 rounded-[11px] border border-white/20"/>
        <CrossIcon className="relative h-6 w-6" weight="fill"/>
      </span>
    </span>
    );
}
