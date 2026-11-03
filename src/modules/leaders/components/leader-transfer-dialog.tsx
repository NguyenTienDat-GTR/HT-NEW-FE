"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowsLeftRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { optionFromRow, rowsFromResponse } from "@/components/form/resource-form/api-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { resourceKey } from "@/lib/api/query-keys";
import { serializeBaseSearch } from "@/lib/api/search";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import type { LeaderDetail } from "./leader-detail-utils";

type ParishRow = {
  id: string;
  name?: string | null;
  unitTypeLabel?: string | null;
  parentParishName?: string | null;
  deaneryName?: string | null;
};

const PAGE_SIZE = 10;
const selectClass =
  "h-10 cursor-pointer rounded-lg border border-input bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]";

type LeaderTransferDialogProps = {
  leader: LeaderDetail;
  leaderId: string;
  endpoint: string;
  onTransferred: (updated: LeaderDetail) => void;
};

// Chuyển huynh trưởng sang giáo xứ khác: chức năng riêng (quyền riêng) tách khỏi sửa hồ sơ.
// Modal liệt kê giáo xứ / giáo họ / giáo điểm dạng bảng có tìm kiếm, lọc theo giáo hạt và phân trang.
export function LeaderTransferDialog(props: LeaderTransferDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline">
          <ArrowsLeftRight size={18} />
          Chuyển xứ
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        {open ? <TransferContent {...props} onClose={() => setOpen(false)} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TransferContent({ leader, leaderId, endpoint, onTransferred, onClose }: LeaderTransferDialogProps & { onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [deaneryId, setDeaneryId] = useState("");
  const [chosen, setChosen] = useState<ParishRow | null>(null);
  const debouncedSearch = useDebouncedValue(search).trim();
  // Trang gắn với tiêu chí đã gửi: đổi tìm kiếm / bộ lọc thì tự về trang đầu.
  const criteria = `${debouncedSearch}|${deaneryId}`;
  const [pageState, setPageState] = useState({ page: 0, criteria });
  const page = pageState.criteria === criteria ? pageState.page : 0;
  const setPage = (next: number) => setPageState({ page: next, criteria });
  const queryClient = useQueryClient();

  const deaneriesQuery = useQuery({
    queryKey: ["leader-transfer", "deaneries"],
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>("/deaneries?page=0&size=100"),
  });
  const deaneryOptions = useMemo(() => rowsFromResponse(deaneriesQuery.data).map((row) => optionFromRow(row, "id", "name")), [deaneriesQuery.data]);
  // Phạm vi chỉ có một giáo hạt thì không cần bộ lọc.
  const showDeanery = deaneryOptions.length > 1;

  const parishesQuery = useQuery({
    queryKey: resourceKey("/parishes", "leader-transfer", criteria, page),
    queryFn: () =>
      apiFetch<PageResponse<ParishRow>>(
        `/parishes?${serializeBaseSearch({
          page,
          size: PAGE_SIZE,
          search: debouncedSearch,
          searchFields: ["name", "chapterName"],
          status: true,
          sortBy: "name",
          sortDirection: "ASC",
          filters: { "deanery.id": deaneryId },
        }).toString()}`,
      ),
  });
  const rows = parishesQuery.data?.content ?? [];
  const totalPages = parishesQuery.data?.totalPages ?? 0;
  const columnCount = 5;

  const mutation = useMutation({
    mutationFn: () => apiFetch<LeaderDetail>(`/leaders/${encodeURIComponent(leaderId)}/transfer`, { method: "POST", body: JSON.stringify({ parishId: chosen?.id }) }),
    onSuccess: async (updated) => {
      toast.success("Chuyển giáo xứ thành công");
      onClose();
      onTransferred(updated);
      await queryClient.invalidateQueries({ queryKey: resourceKey(endpoint) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-32px)] max-w-[900px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-xl focus:outline-none">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <Dialog.Title className="text-lg font-semibold text-foreground">Chuyển giáo xứ</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
            Chọn đơn vị mới cho {leader.holyName ? `${leader.holyName} ` : ""}
            {leader.fullName}, hiện thuộc {leader.parishName ?? "giáo xứ hiện tại"}. Các tài khoản xem hồ sơ huynh trưởng của hai đơn vị sẽ nhận thông báo.
          </Dialog.Description>
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
          <Input className="h-10 pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên giáo xứ / giáo họ / giáo điểm" value={search} />
        </div>
        {showDeanery ? (
          <select aria-label="Lọc theo giáo hạt" className={selectClass} onChange={(event) => setDeaneryId(event.target.value)} value={deaneryId}>
            <option value="">Tất cả giáo hạt</option>
            {deaneryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.02em] text-muted">
            <tr className="border-b border-border">
              <th className="w-10 py-2" />
              <th className="py-2">STT</th>
              <th className="py-2">Đơn vị</th>
              <th className="py-2">Trực thuộc giáo xứ</th>
              <th className="py-2">Giáo hạt</th>
            </tr>
          </thead>
          <tbody>
            {parishesQuery.isLoading ? (
              <tr>
                <td className="py-6 text-center text-muted" colSpan={columnCount}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : null}
            {parishesQuery.isError ? (
              <tr>
                <td className="py-6 text-center text-danger" colSpan={columnCount}>
                  Không thể tải danh sách giáo xứ
                </td>
              </tr>
            ) : null}
            {!parishesQuery.isLoading && !parishesQuery.isError && rows.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-muted" colSpan={columnCount}>
                  Không có đơn vị phù hợp
                </td>
              </tr>
            ) : null}
            {rows.map((row, index) => {
              const isCurrent = row.id === leader.parishId;
              const checked = chosen?.id === row.id;
              return (
                <tr
                  className={cn("border-b border-border/60", isCurrent ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-primary/5", checked && "bg-primary/8")}
                  key={row.id}
                  onClick={() => (isCurrent ? undefined : setChosen(row))}
                >
                  <td className="py-2">
                    <input
                      aria-label={`Chọn ${row.name ?? ""}`}
                      checked={checked}
                      className="h-4 w-4 accent-primary"
                      disabled={isCurrent}
                      name="transfer-parish"
                      onChange={() => setChosen(row)}
                      onClick={(event) => event.stopPropagation()}
                      type="radio"
                    />
                  </td>
                  <td className="py-2">{page * PAGE_SIZE + index + 1}</td>
                  <td className="py-2 font-semibold text-foreground">
                    {row.unitTypeLabel ? `${row.unitTypeLabel} ` : ""}
                    {row.name ?? "—"}
                    {isCurrent ? <span className="ml-2 text-xs font-normal text-muted">(đơn vị hiện tại)</span> : null}
                  </td>
                  <td className="py-2">{row.parentParishName ?? "—"}</td>
                  <td className="py-2">{row.deaneryName ?? "—"}</td>
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
          {chosen ? <span className="hidden text-sm text-muted sm:inline">Đã chọn: {chosen.unitTypeLabel ? `${chosen.unitTypeLabel} ` : ""}{chosen.name}</span> : null}
          <Button onClick={onClose} type="button" variant="outline">
            Hủy
          </Button>
          <Button disabled={!chosen} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button" variant="primary">
            Chuyển
          </Button>
        </div>
      </div>
    </Dialog.Content>
  );
}
