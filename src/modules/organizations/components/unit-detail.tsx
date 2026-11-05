"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge, ResourceCell } from "@/components/common/resource/resource-format";
import { ExecutiveBoardSection } from "@/modules/executive-board/components/executive-board-section";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { SITE_SUBDOMAIN_PERMISSION } from "../site-subdomain";
import { SiteSubdomainCard } from "./site-subdomain-card";
import { isLockedByParent } from "../types";
import { ParentParishCard } from "./parent-parish-card";
import { UnitStatusHistory } from "./unit-status-history";

export type UnitKind = "dioceses" | "deaneries" | "parishes";

type Field = { key: string; label: string };

const STAT_TONES = {
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

type Stat = Field & { tone: keyof typeof STAT_TONES };

const UNIT_LABEL: Record<UnitKind, string> = { dioceses: "Giáo phận", deaneries: "Giáo hạt", parishes: "Giáo xứ" };

const STATS: Record<UnitKind, Stat[]> = {
  dioceses: [
    { key: "deaneryCount", label: "Giáo hạt", tone: "sky" },
    { key: "parishCount", label: "Giáo xứ", tone: "emerald" },
    { key: "leaderCount", label: "Huynh trưởng", tone: "amber" },
  ],
  deaneries: [
    { key: "parishCount", label: "Giáo xứ", tone: "emerald" },
    { key: "leaderCount", label: "Huynh trưởng", tone: "amber" },
  ],
  parishes: [
    { key: "subUnitCount", label: "Giáo họ / giáo điểm", tone: "emerald" },
    { key: "leaderCount", label: "Huynh trưởng", tone: "amber" },
  ],
};

const GENERAL_FIELDS: Record<UnitKind, Field[]> = {
  dioceses: [
    { key: "unionName", label: "Liên đoàn" },
    { key: "patronSaintDay", label: "Ngày bổn mạng" },
    { key: "establishmentDate", label: "Ngày thành lập" },
  ],
  deaneries: [
    { key: "associationName", label: "Hiệp đoàn" },
    { key: "patronSaintDay", label: "Ngày bổn mạng" },
    { key: "establishmentDate", label: "Ngày thành lập" },
  ],
  parishes: [
    { key: "unitTypeLabel", label: "Loại đơn vị" },
    { key: "parentParishName", label: "Thuộc giáo xứ" },
    { key: "chapterName", label: "Xứ đoàn" },
    { key: "patronSaintDay", label: "Ngày bổn mạng" },
    { key: "establishmentDate", label: "Ngày thành lập" },
  ],
};

const CONTACT_FIELDS: Field[] = [
  { key: "phoneNumber", label: "Số điện thoại" },
  { key: "email", label: "Email" },
];

const AUDIT_FIELDS: Field[] = [
  { key: "createdByName", label: "Người tạo" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "updatedByName", label: "Người cập nhật" },
  { key: "updatedAt", label: "Ngày cập nhật" },
];

// Chi tiết giáo phận / giáo hạt / giáo xứ: thông tin nhóm theo mục, thống kê có màu, ban điều hành của đơn vị.
// readOnly: dùng khi xem giáo phận / giáo hạt cấp trên từ giáo hạt / giáo xứ của mình (thông tin và ban điều hành, không số liệu thống kê, lịch sử, quản trị).
export function UnitDetail({ kind, id, row, readOnly = false }: { kind: UnitKind; id: string; row: Record<string, unknown>; readOnly?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const path = [kind !== "dioceses" ? row.dioceseName : null, kind === "parishes" ? row.deaneryName : null].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted">{kind === "parishes" && typeof row.unitTypeLabel === "string" ? row.unitTypeLabel : UNIT_LABEL[kind]}</p>
            <h2 className="mt-1 break-words text-lg font-semibold leading-[26px] text-foreground">{String(row.name ?? "—")}</h2>
            {path.length ? <p className="mt-1 text-sm text-muted">{path.join(" › ")}</p> : null}
            {!readOnly ? <ParentUnitLinks kind={kind} row={row} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {typeof row.status === "boolean" ? <Badge tone={row.status ? "success" : "neutral"}>{row.status ? "Đang hoạt động" : "Tạm ngưng"}</Badge> : null}
            {isLockedByParent(row) ? <Badge tone="warning">Ngưng theo đơn vị cha</Badge> : null}
          </div>
        </div>
        {!readOnly ? <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {STATS[kind].filter((stat) => !(stat.key === "subUnitCount" && row.unitType !== undefined && row.unitType !== "PARISH")).map((stat) => (
            <div className={cn("rounded-lg border px-3 py-2", STAT_TONES[stat.tone])} key={stat.key}>
              <p className="text-xs font-medium opacity-80">{stat.label}</p>
              <p className="mt-0.5 text-xl font-semibold leading-7">{typeof row[stat.key] === "number" ? (row[stat.key] as number).toLocaleString("vi-VN") : "0"}</p>
            </div>
          ))}
        </div> : null}
      </section>

      <div className="grid gap-3 md:grid-cols-[3fr_2fr]">
        <FieldsCard columns={3} fields={GENERAL_FIELDS[kind]} row={row} title="Thông tin chung" />
        <FieldsCard columns={1} fields={CONTACT_FIELDS} row={row} title="Liên hệ" />
      </div>

      {kind === "dioceses" && !readOnly && hasPermission(user, SITE_SUBDOMAIN_PERMISSION) ? <SiteSubdomainCard dioceseId={id} key={`${id}:${String(row.siteSubdomain ?? "")}`} row={row} /> : null}

      {!readOnly && kind === "parishes" && typeof row.unitType === "string" && row.unitType !== "PARISH" ? <ParentParishCard id={id} row={row} /> : null}

      <ExecutiveBoardSection kind={kind} unitId={id} />

      {!readOnly ? <UnitStatusHistory endpoint={`/${kind}`} unitId={id} /> : null}

      {!readOnly ? <FieldsCard columns={4} fields={AUDIT_FIELDS} row={row} title="Lịch sử ghi nhận" /> : null}
    </div>
  );
}

function FieldsCard({ title, fields, row, columns = 2 }: { title: string; fields: Field[]; row: Record<string, unknown>; columns?: 1 | 2 | 3 | 4 }) {
  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <dl className={cn("mt-2.5 grid grid-cols-1 gap-x-4 gap-y-3", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3", columns === 4 && "sm:grid-cols-2 xl:grid-cols-4")}>
        {fields.map(({ key, label }) => {
          const value = row[key];
          const empty = value === null || value === undefined || value === "";
          return (
            <div key={key}>
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="mt-0.5 break-words text-sm leading-5 text-foreground">
                {empty ? <span className="text-muted">—</span> : <ResourceCell column={key} displayMode="detail" row={row} value={value} />}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

// Giáo xứ xem được chi tiết giáo hạt và giáo phận của mình, giáo hạt xem được giáo phận của mình (chỉ đọc, BE kiểm tra phạm vi).
function ParentUnitLinks({ kind, row }: { kind: UnitKind; row: Record<string, unknown> }) {
  const links: { kind: UnitKind; id: string; label: string }[] = [];
  if (kind === "parishes" && typeof row.deaneryId === "string" && row.deaneryId) links.push({ kind: "deaneries", id: row.deaneryId, label: "Xem giáo hạt" });
  if (kind !== "dioceses" && typeof row.dioceseId === "string" && row.dioceseId) links.push({ kind: "dioceses", id: row.dioceseId, label: "Xem giáo phận" });
  if (!links.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((link) => (
        <ParentUnitDialog key={link.kind} {...link} />
      ))}
    </div>
  );
}

function ParentUnitDialog({ kind, id, label }: { kind: UnitKind; id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["parent-unit-detail", kind, id],
    enabled: open,
    queryFn: () => apiFetch<Record<string, unknown>>(`/${kind}/${encodeURIComponent(id)}`),
  });
  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <Button size="sm" type="button" variant="outline">
          {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] max-h-[85dvh] w-[calc(100%-2rem)] max-w-[820px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-slate-50 p-4 shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="text-base font-semibold text-foreground">{UNIT_LABEL[kind]}</Dialog.Title>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Thông tin chi tiết {UNIT_LABEL[kind].toLowerCase()} (chỉ xem)</Dialog.Description>
          {query.isLoading ? <p className="text-sm text-muted">Đang tải...</p> : null}
          {query.isError ? <p className="text-sm text-danger">Không xem được thông tin {UNIT_LABEL[kind].toLowerCase()} này.</p> : null}
          {query.data ? <UnitDetail id={id} kind={kind} readOnly row={query.data} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
