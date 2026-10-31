"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { FilePdf, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCOPE_LABELS } from "@/modules/certificates/components/certificate-design";
import { Callout, Field, SELECT_CLASS } from "@/modules/layout-config/form-controls";
import { formatMm, mirrorColumnsFor, paperMm, type FlipEdge } from "@/modules/badges/badge-sheet";
import { fetchBadgeConfigs, participantKeys } from "../api";
import type { BadgeExportOptions } from "../types";

type Props = {
  courseCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  totalParticipants: number;
  teams: string[];
  pending: boolean;
  onExport: (options: BadgeExportOptions) => void;
};

// Xuất thẻ tham dự ra PDF: chọn cấu hình thẻ (mặc định cấu hình chung của khóa), đội, in một hay hai mặt và cạnh lật khi in hai mặt.
export function BadgeExportDialog(props: Props) {
  return (
    <Dialog.Root onOpenChange={props.onOpenChange} open={props.open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(94vw,540px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-elevated)] focus:outline-none">
          <ExportBody {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Thân hộp thoại chỉ được dựng khi mở nên mỗi lần mở lại là một lựa chọn mới.
function ExportBody({ courseCode, open, selectedIds, totalParticipants, teams, pending, onExport }: Props) {
  const [configId, setConfigId] = useState("");
  const [team, setTeam] = useState("");
  const [includeBack, setIncludeBack] = useState(true);
  const [flipEdge, setFlipEdge] = useState<FlipEdge>("LONG");
  const hasSelection = selectedIds.length > 0;

  const configsQuery = useQuery({
    queryKey: [...participantKeys.all(courseCode), "badge-configs"],
    enabled: open,
    queryFn: () => fetchBadgeConfigs(courseCode),
  });
  const configs = useMemo(() => configsQuery.data ?? [], [configsQuery.data]);
  const applied = configs.find((config) => config.applied) ?? null;
  const active = configs.find((config) => config.id === configId) ?? applied;

  const duplex = Boolean(active?.hasBack) && includeBack;
  const count = hasSelection ? selectedIds.length : totalParticipants;
  const pages = active && active.cardsPerPage > 0 ? Math.ceil(count / active.cardsPerPage) * (duplex ? 2 : 1) : 0;
  const [paperW, paperH] = active ? paperMm(active.paperSize, active.paperOrientation) : [210, 297];
  const mirrorHint = mirrorColumnsFor(paperW, paperH, flipEdge) ? "đổi chỗ cột trái ↔ phải" : "đổi chỗ hàng trên ↔ dưới";
  const noConfig = configsQuery.isSuccess && configs.length === 0;

  return (
    <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Xuất thẻ tham dự</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">Tạo file PDF thẻ cho hồ sơ trong danh sách tham dự; mỗi trang giấy xếp nhiều thẻ theo khổ thẻ của cấu hình.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-3">
            {noConfig ? (
              <Callout tone="warning">Chưa có cấu hình thẻ tham dự nào dùng được cho khóa này. Hãy tạo cấu hình ở menu Huấn luyện → Cấu hình thẻ tham dự (đặt làm cấu hình chung để mọi khóa dùng).</Callout>
            ) : null}
            {configsQuery.isError ? <Callout tone="danger">Không tải được danh sách cấu hình thẻ. Hãy thử lại.</Callout> : null}

            <Field label="Cấu hình thẻ">
              <select className={cn(SELECT_CLASS, "w-full")} disabled={configs.length === 0} onChange={(event) => setConfigId(event.target.value)} value={configId}>
                <option value="">{applied ? `Cấu hình chung: ${applied.name}` : "— Chưa có cấu hình chung —"}</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} · {SCOPE_LABELS[config.scopeLevel]} · {formatMm(config.cardWidthMm)}×{formatMm(config.cardHeightMm)} mm{config.hasBack ? " · 2 mặt" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Đội" hint="Chỉ xuất thẻ của một đội. Bỏ trống để xuất tất cả (hoặc các hồ sơ đã chọn trong bảng).">
              <select className={cn(SELECT_CLASS, "w-full")} disabled={hasSelection} onChange={(event) => setTeam(event.target.value)} value={hasSelection ? "" : team}>
                <option value="">{hasSelection ? `Chỉ ${selectedIds.length} hồ sơ đã chọn` : "Tất cả hồ sơ"}</option>
                {teams.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </Field>

            {active?.hasBack ? (
              <div className="space-y-2 rounded-lg border border-border bg-slate-50 px-3 py-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input checked={includeBack} className="h-4 w-4 accent-[var(--primary)]" onChange={(event) => setIncludeBack(event.target.checked)} type="checkbox" />
                  Xuất cả mặt sau (in hai mặt)
                </label>
                {includeBack ? (
                  <Field label="Cạnh lật khi in hai mặt" hint="Chọn đúng với cài đặt in hai mặt của máy in để mặt sau khớp mặt trước: lật theo cạnh dài (mặc định) hoặc cạnh ngắn của tờ giấy.">
                    <select className={cn(SELECT_CLASS, "w-full")} onChange={(event) => setFlipEdge(event.target.value as FlipEdge)} value={flipEdge}>
                      <option value="LONG">Lật theo cạnh dài (mặc định của máy in)</option>
                      <option value="SHORT">Lật theo cạnh ngắn</option>
                    </select>
                  </Field>
                ) : null}
                {includeBack ? <p className="text-xs text-muted">Trang mặt sau xếp thẻ {mirrorHint} để trùng khớp mặt trước khi lật tờ giấy.</p> : null}
              </div>
            ) : null}

            {active ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-text-secondary">
                <span className="font-semibold text-foreground">{count} thẻ</span> · {active.cardsPerPage || "?"} thẻ / trang giấy {active.paperSize} → khoảng <span className="font-semibold text-foreground">{pages} trang</span>
                {duplex ? " (kể cả trang mặt sau)" : ""}.
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </Dialog.Close>
            <Button
              disabled={!active || count === 0}
              loading={pending}
              onClick={() =>
                onExport({
                  configId: configId || undefined,
                  participationIds: hasSelection ? selectedIds : undefined,
                  teamName: hasSelection ? undefined : team || undefined,
                  includeBack,
                  flipEdge,
                })
              }
              type="button"
            >
              <FilePdf size={16} /> Xuất PDF
            </Button>
          </div>
        </>
  );
}
