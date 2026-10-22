import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { RouteConfig } from "@/config/routes/routes";
import { cn } from "@/lib/utils";

export function ResourceListHeader({
  moduleLabel,
  moduleHref,
  route,
  embedded = false,
  actions,
}: {
  moduleLabel: string;
  moduleHref?: string;
  route: RouteConfig;
  embedded?: boolean;
  actions?: ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", embedded && "hidden")}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-muted">
          <Link className="text-primary hover:text-primary-hover" href="/dashboard">
            Trang chủ
          </Link>
          <span aria-hidden>›</span>
          {moduleHref ? (
            <Link className="text-primary hover:text-primary-hover" href={moduleHref as Route}>
              {moduleLabel}
            </Link>
          ) : (
            <span>{moduleLabel}</span>
          )}
        </div>
        <h1 className="text-2xl font-bold leading-8 text-foreground">{route.title}</h1>
        {route.subtitle ? <p className="max-w-[78ch] text-sm leading-5 text-text-secondary">{route.subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
