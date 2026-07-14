import { cn } from "@/lib/utils";
import * as React from "react";

export const Panel = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <section ref={ref} className={cn("rounded-[12px] border border-border bg-white shadow-[var(--shadow-card)]", className)} {...props} />
));
Panel.displayName = "Panel";
