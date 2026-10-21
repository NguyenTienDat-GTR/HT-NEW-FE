import type { RouteConfig } from "@/config/routes/routes";
import { cn } from "@/lib/utils";

export function ResourceListHeader({
  moduleLabel,
  route,
  embedded = false,
}: {
  moduleLabel: string;
  route: RouteConfig;
  embedded?: boolean;
}) {
  return (
    <section className={cn("min-w-0 space-y-1", embedded && "hidden")}>
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-muted">
        <span>Trang chủ</span>
        <span aria-hidden>›</span>
        <span>{moduleLabel}</span>
      </div>
      <h1 className="text-2xl font-bold leading-8 text-foreground">{route.title}</h1>
      {route.subtitle ? <p className="max-w-[78ch] text-sm leading-5 text-text-secondary">{route.subtitle}</p> : null}
    </section>
  );
}
