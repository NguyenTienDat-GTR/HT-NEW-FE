import { Plus } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RouteConfig } from "@/config/routes/routes";

export function ResourceListHeader({
  canCreate,
  moduleDescription,
  moduleLabel,
  route,
}: {
  canCreate: boolean;
  moduleDescription: string;
  moduleLabel: string;
  route: RouteConfig;
}) {
  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted">
          <span>Trang chủ</span>
          <span aria-hidden>›</span>
          <span>{moduleLabel}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-[0] text-foreground md:text-3xl">{route.title}</h1>
        <p className="mt-2 max-w-[82ch] text-sm leading-6 text-muted">{route.subtitle || moduleDescription}</p>
      </div>
      {route.primaryActionLabel && route.createPath && canCreate ? (
        <Button asChild title={canCreate ? undefined : "Tài khoản hiện tại chưa có quyền tạo/cập nhật"}>
          <Link href={route.createPath as Route}>
            <Plus size={18} />
            {route.primaryActionLabel}
          </Link>
        </Button>
      ) : null}
    </section>
  );
}
