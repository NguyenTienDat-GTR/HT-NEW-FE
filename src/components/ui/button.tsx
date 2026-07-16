"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleNotch } from "@phosphor-icons/react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-4 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 motion-safe:active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "border border-primary bg-primary text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.22),0_10px_22px_rgb(108_71_255_/_0.20)] hover:border-primary-hover hover:bg-primary-hover hover:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18),0_12px_26px_rgb(108_71_255_/_0.24)]",
        secondary: "border border-surface-2 bg-surface-2 text-foreground hover:border-border hover:bg-border",
        outline: "border border-border bg-white text-foreground shadow-sm hover:border-primary hover:bg-primary-soft hover:text-primary",
        ghost: "border border-transparent bg-transparent text-foreground hover:bg-primary-soft hover:text-primary",
        destructive: "border border-danger bg-danger text-white shadow-[0_10px_22px_rgb(239_68_68_/_0.18)] hover:bg-[#dc2626]",
        icon: "border border-border bg-white p-0 text-foreground shadow-sm hover:border-primary hover:bg-primary-soft hover:text-primary",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-10 px-3",
        lg: "h-12 px-5",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref as React.Ref<HTMLElement>}
          aria-disabled={disabled || loading ? true : undefined}
          data-loading={loading ? "" : undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={disabled || loading} {...props}>
        <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
        {loading ? (
          <span className="absolute inset-0 inline-flex items-center justify-center" aria-hidden>
            <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
          </span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = "Button";
