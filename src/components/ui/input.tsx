import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[8px] border border-border bg-white px-3 text-sm text-foreground shadow-sm transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:bg-surface-1 disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
