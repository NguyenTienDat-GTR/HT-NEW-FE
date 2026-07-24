import type { RouteConfig } from "@/config/routes/routes";
import { cn, viNumber } from "@/lib/utils";
import type { ResourceKpi, ResourceKpiTone } from "./resource-kpis";

export function ResourceListHeader({
  moduleLabel,
  kpis,
  kpisLoading,
  route,
}: {
  moduleLabel: string;
  kpis: ResourceKpi[];
  kpisLoading: boolean;
  route: RouteConfig;
}) {
  return (
    <section className="space-y-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>Trang chủ</span>
          <span aria-hidden>›</span>
          <span>{moduleLabel}</span>
          <span aria-hidden>›</span>
          <span className="font-semibold text-foreground">{route.title}</span>
        </div>
      </div>
      {kpis.length ? (
        <div className="flex flex-wrap gap-2">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} loading={kpisLoading} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function KpiCard({ kpi, loading }: { kpi: ResourceKpi; loading: boolean }) {
  return (
    <div className={cn("inline-flex w-fit min-w-[118px] items-center gap-2 rounded-[10px] border bg-white px-3 py-2 shadow-sm", toneClass(kpi.tone))}>
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass(kpi.tone))} />
      <div className="min-w-0">
        <div className="max-w-[150px] truncate text-[11px] font-semibold leading-4 text-muted">{kpi.label}</div>
        <div className="text-lg font-semibold leading-6 tracking-[0] text-foreground">{loading ? "..." : viNumber.format(kpi.value)}</div>
      </div>
    </div>
  );
}

function toneClass(tone: ResourceKpiTone) {
  switch (tone) {
    case "success":
      return "border-success/20 bg-success/5";
    case "warning":
      return "border-warning/25 bg-warning/10";
    case "accent":
      return "border-accent/20 bg-accent/5";
    case "danger":
      return "border-danger/20 bg-danger/5";
    default:
      return "border-primary/15 bg-primary/5";
  }
}

function dotClass(tone: ResourceKpiTone) {
  switch (tone) {
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "accent":
      return "bg-accent";
    case "danger":
      return "bg-danger";
    default:
      return "bg-primary";
  }
}
