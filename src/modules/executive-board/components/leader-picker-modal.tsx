"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatLeaderLevel } from "@/components/common/resource/resource-format";
import { optionFromRow, rowsFromResponse } from "@/components/form/resource-form/api-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch } from "@/lib/api/search";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { formatDate } from "@/modules/leaders/components/leader-detail-utils";

export type PickedLeader = {
  id: string;
  holyName?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  leaderLevel?: string | null;
  parishName?: string | null;
  deaneryName?: string | null;
};

const PAGE_SIZE = 10;
// Họ tên ghép, tên thánh, email, số điện thoại, giáo xứ, giáo hạt (cùng cấu hình tìm kiếm với danh sách huynh trưởng).
const LEADER_SEARCH_FIELDS = ["lastName+firstName", "holyName", "email", "phoneNumber", "parish.name", "parish.deanery.name"];

export function leaderDisplayName(leader: Pick<PickedLeader, "holyName" | "fullName"> | undefined) {
  return [leader?.holyName, leader?.fullName].filter(Boolean).join(" ");
}

// Chọn một huynh trưởng trong phạm vi tài khoản: có tìm kiếm, bộ lọc giáo hạt/giáo xứ và phân trang.
export function LeaderPickerModal({
  open,
  selectedId,
  onClose,
  onSelect,
}: {
  open: boolean;
  selectedId?: string;
  onClose: () => void;
  onSelect: (leader: PickedLeader) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-[4px]" />
        {open ? <PickerContent onClose={onClose} onSelect={onSelect} selectedId={selectedId} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PickerContent({ selectedId, onClose, onSelect }: { selectedId?: string; onClose: () => void; onSelect: (leader: PickedLeader) => void }) {
  const [search, setSearch] = useState("");
  const [deaneryId, setDeaneryId] = useState("");
  const [parishId, setParishId] = useState("");
  const [chosen, setChosen] = useState<PickedLeader | null>(null);
  const debouncedSearch = useDebouncedValue(search).trim();
  // Trang gắn với bộ tìm kiếm/lọc đã gửi: đổi tiêu chí thì tự về trang đầu.
  const criteria = `${debouncedSearch}|${deaneryId}|${parishId}`;
  const [pageState, setPageState] = useState({ page: 0, criteria });
  const page = pageState.criteria === criteria ? pageState.page : 0;
  const setPage = (next: number) => setPageState({ page: next, criteria });

  const deaneriesQuery = useQuery({
    queryKey: ["registration-scope", "deaneries"],
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>("/deaneries?page=0&size=100"),
  });
  const parishesQuery = useQuery({
    queryKey: ["registration-scope", "parishes"],
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>("/parishes?page=0&size=100"),
  });
  const deaneryOptions = useMemo(() => rowsFromResponse(deaneriesQuery.data).map((row) => optionFromRow(row, "id", "name")), [deaneriesQuery.data]);
  const parishRows = useMemo(() => rowsFromResponse(parishesQuery.data), [parishesQuery.data]);
  const parishOptions = useMemo(
    () =>
      parishRows
        .filter((row) => !deaneryId || String((row.deaneryId as string | undefined) ?? (row.deanery as { id?: string } | undefined)?.id ?? "") === deaneryId)
        .map((row) => optionFromRow(row, "id", "name")),
    [parishRows, deaneryId],
  );
  // Phạm vi tài khoản chỉ có một giáo hạt/giáo xứ thì không cần bộ lọc và cột tương ứng.
  const showDeanery = deaneryOptions.length > 1;
  const showParish = parishRows.length > 1;

  const leadersQuery = useQuery({
    queryKey: ["resource", "/leaders", "picker", criteria, page],
    queryFn: () =>
      apiFetch<PageResponse<PickedLeader>>(
        `/leaders?${serializeBaseSearch({
          page,
          size: PAGE_SIZE,
          search: debouncedSearch,
          searchFields: LEADER_SEARCH_FIELDS,
          status: true,
          filters: { "parish.deanery.id": deaneryId, "parish.id": parishId },
        }).toString()}`,
      ),
  });
  const rows = leadersQuery.data?.content ?? [];
  const totalPages = leadersQuery.data?.totalPages ?? 0;
  const currentId = chosen?.id ?? selectedId;
  const columnCount = 6 + (showParish ? 1 : 0) + (showDeanery ? 1 : 0);

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] flex max-h-[92vh] w-[calc(100vw-32px)] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-xl focus:outline-none">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <Dialog.Title className="text-lg font-semibold text-foreground">Chọn huynh trưởng</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">Chọn một huynh trưởng để phân công vào chức vụ.</Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={20} />
          </Button>
        </Dialog.Close>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <div className="relative min-w-[240px] flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <Input className="h-10 pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, giáo xứ, giáo hạt" value={search} />
        </div>
        {showDeanery ? (
          <select
            className="h-10 cursor-pointer rounded-lg border border-input bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]"
            onChange={(event) => {
              setDeaneryId(event.target.value);
              setParishId("");
            }}
            value={deaneryId}
          >
            <option value="">Tất cả giáo hạt</option>
            {deaneryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        {showParish ? (
          <select className="h-10 cursor-pointer rounded-lg border border-input bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]" onChange={(event) => setParishId(event.target.value)} value={parishId}>
            <option value="">Tất cả giáo xứ</option>
            {parishOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.02em] text-muted">
            <tr className="border-b border-border">
              <th className="w-10 py-2" />
              <th className="py-2">STT</th>
              <th className="py-2">Tên thánh</th>
              <th className="py-2">Họ tên</th>
              <th className="py-2">Ngày sinh</th>
              <th className="py-2">Cấp huynh trưởng</th>
              {showParish ? <th className="py-2">Giáo xứ</th> : null}
              {showDeanery ? <th className="py-2">Giáo hạt</th> : null}
            </tr>
          </thead>
          <tbody>
            {leadersQuery.isLoading ? (
              <tr>
                <td className="py-6 text-center text-muted" colSpan={columnCount}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : null}
            {leadersQuery.isError ? (
              <tr>
                <td className="py-6 text-center text-danger" colSpan={columnCount}>
                  Không thể tải danh sách huynh trưởng
                </td>
              </tr>
            ) : null}
            {!leadersQuery.isLoading && !leadersQuery.isError && rows.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-muted" colSpan={columnCount}>
                  Không có huynh trưởng phù hợp
                </td>
              </tr>
            ) : null}
            {rows.map((row, index) => {
              const checked = currentId === row.id;
              return (
                <tr className={cn("cursor-pointer border-b border-border/60 hover:bg-primary/5", checked && "bg-primary/8")} key={row.id} onClick={() => setChosen(row)}>
                  <td className="py-2">
                    <input
                      aria-label={`Chọn ${row.fullName ?? ""}`}
                      checked={checked}
                      className="h-4 w-4 accent-primary"
                      name="assignment-leader"
                      onChange={() => setChosen(row)}
                      onClick={(event) => event.stopPropagation()}
                      type="radio"
                    />
                  </td>
                  <td className="py-2">{page * PAGE_SIZE + index + 1}</td>
                  <td className="py-2">{row.holyName ?? "—"}</td>
                  <td className="py-2 font-semibold text-foreground">{row.fullName ?? "—"}</td>
                  <td className="py-2">{formatDate(row.birthDate)}</td>
                  <td className="py-2">{formatLeaderLevel(row.leaderLevel ?? "")}</td>
                  {showParish ? <td className="py-2">{row.parishName ?? "—"}</td> : null}
                  {showDeanery ? <td className="py-2">{row.deaneryName ?? "—"}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Button disabled={page <= 0} onClick={() => setPage(Math.max(page - 1, 0))} size="sm" type="button" variant="outline">
            Trước
          </Button>
          <span>
            Trang {totalPages === 0 ? 0 : page + 1}/{totalPages}
          </span>
          <Button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)} size="sm" type="button" variant="outline">
            Sau
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onClose} type="button" variant="outline">
            Hủy
          </Button>
          <Button disabled={!chosen} onClick={() => chosen && onSelect(chosen)} type="button">
            Chọn huynh trưởng
          </Button>
        </div>
      </div>
    </Dialog.Content>
  );
}
