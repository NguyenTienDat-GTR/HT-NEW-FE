"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Button, type ButtonProps } from "./button";

type TooltipIconButtonProps = ButtonProps & {
  label: string;
};

export function TooltipIconButton({ label, children, ...props }: TooltipIconButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button aria-label={label} size="icon" variant="icon" {...props}>
          {children}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-50 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-card)]"
          sideOffset={8}
        >
          {label}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
