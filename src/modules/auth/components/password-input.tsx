"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Ô mật khẩu có nút hiện / ẩn. Đặt trong phần tử `relative` (cùng cách dùng với các ô nhập có biểu tượng bên trái). */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <>
        <Input className={cn("pr-12", className)} ref={ref} type={visible ? "text" : "password"} {...props} />
        <button
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-muted/10 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeSlash className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
