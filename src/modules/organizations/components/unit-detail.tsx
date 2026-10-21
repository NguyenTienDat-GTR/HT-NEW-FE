"use client";

import { Badge, ResourceCell } from "@/components/common/resource/resource-format";
import { ExecutiveBoardSection } from "@/modules/executive-board/components/executive-board-section";
import { cn } from "@/lib/utils";
import { isLockedByParent } from "../types";
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
  parishes: [{ key: "leaderCount", label: "Huynh trưởng", tone: "amber" }],
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
export function UnitDetail({ kind, id, row }: { kind: UnitKind; id: string; row: Record<string, unknown> }) {
  const path = [kind !== "dioceses" ? row.dioceseName : null, kind === "parishes" ? row.deaneryName : null].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted">{UNIT_LABEL[kind]}</p>
            <h2 className="mt-1 break-words text-lg font-semibold leading-[26px] text-foreground">{String(row.name ?? "—")}</h2>
            {path.length ? <p className="mt-1 text-sm text-muted">{path.join(" › ")}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {typeof row.status === "boolean" ? <Badge tone={row.status ? "success" : "neutral"}>{row.status ? "Đang hoạt động" : "Tạm ngưng"}</Badge> : null}
            {isLockedByParent(row) ? <Badge tone="warning">Ngưng theo đơn vị cha</Badge> : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STATS[kind].map((stat) => (
            <div className={cn("rounded-lg border px-3 py-2.5", STAT_TONES[stat.tone])} key={stat.key}>
              <p className="text-xs font-medium opacity-80">{stat.label}</p>
              <p className="mt-0.5 text-2xl font-semibold">{typeof row[stat.key] === "number" ? (row[stat.key] as number).toLocaleString("vi-VN") : "0"}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldsCard fields={GENERAL_FIELDS[kind]} row={row} title="Thông tin chung" />
        <FieldsCard fields={CONTACT_FIELDS} row={row} title="Liên hệ" />
      </div>

      <ExecutiveBoardSection kind={kind} unitId={id} />

      <UnitStatusHistory endpoint={`/${kind}`} unitId={id} />

      <FieldsCard fields={AUDIT_FIELDS} row={row} title="Lịch sử ghi nhận" />
    </div>
  );
}

function FieldsCard({ title, fields, row }: { title: string; fields: Field[]; row: Record<string, unknown> }) {
  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.map(({ key, label }) => {
          const value = row[key];
          const empty = value === null || value === undefined || value === "";
          return (
            <div key={key}>
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="mt-1 break-words text-sm leading-6 text-foreground">
                {empty ? <span className="text-muted">—</span> : <ResourceCell column={key} displayMode="detail" row={row} value={value} />}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
