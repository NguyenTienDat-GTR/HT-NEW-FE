"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { UsersThree, X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { LeaderPickerModal, leaderDisplayName, type PickedLeader } from "./leader-picker-modal";

// Phân công không sửa được (giữ lịch sử nhiệm kì): chỉ có modal tạo mới.
type AssignmentFormTarget = { mode: "create" };
type UnitLevel = "DIOCESE" | "DEANERY" | "PARISH";
type BoardSeat = { positionCode: string; positionName: string; chaplain: boolean; occupied: boolean };

// Ngày hiện tại theo giờ máy (YYYY-MM-DD) làm ngày bắt đầu mặc định.
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const LEVEL_LABELS: Record<UnitLevel, string> = { DIOCESE: "Giáo phận", DEANERY: "Giáo hạt", PARISH: "Giáo xứ" };

// Tài khoản chỉ phân công đúng cấp mình được cấp quyền, trong đơn vị của chính mình.
function ownCreateScope(user: AuthUser | null): { unitType: UnitLevel; unitId: string | null | undefined } | null {
  if (hasPermission(user, "organization.executive_board_assignment.create.diocese")) return { unitType: "DIOCESE", unitId: user?.dioceseId };
  if (hasPermission(user, "organization.executive_board_assignment.create.deanery")) return { unitType: "DEANERY", unitId: user?.deaneryId };
  if (hasPermission(user, "organization.executive_board_assignment.create.parish")) return { unitType: "PARISH", unitId: user?.parishId };
  return null;
}

export function AssignmentFormDialog({ target, onClose }: { target: AssignmentFormTarget | null; onClose: () => void }) {
  return (
    <Dialog.Root open={target !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        {target ? <AssignmentForm onClose={onClose} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AssignmentForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const scope = ownCreateScope(user);
  const unitType = scope?.unitType;

  // Ban điều hành hiện tại của đơn vị: chỉ cho chọn chức vụ đang hoạt động và chưa có người được phân công (bỏ mục tuyên úy).
  const boardQuery = useQuery({
    queryKey: ["executive-board-seats", unitType, scope?.unitId],
    enabled: Boolean(unitType && scope?.unitId),
    queryFn: () => apiFetch<BoardSeat[]>(`/executive-board/boards/${unitType}/${encodeURIComponent(String(scope?.unitId))}`),
  });
  const positions = (boardQuery.data ?? []).filter((seat) => !seat.chaplain && !seat.occupied);

  const [leader, setLeader] = useState<PickedLeader | null>(null);
  const [positionCode, setPositionCode] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentLeaderId = leader?.id ?? "";
  const currentLeaderName = leader ? leaderDisplayName(leader) : "";
  const currentPosition = positionCode ?? "";
  const currentStart = startDate ?? todayIso();
  const currentEnd = endDate ?? "";
  const dateInvalid = Boolean(currentStart && currentEnd && currentEnd < currentStart);
  const missingUnit = !scope || !scope.unitId;

  const mutation = useMutation({
    mutationFn: () => {
      return apiMutation("/executive-board/assignments", "POST", {
        unitType: scope?.unitType,
        unitId: scope?.unitId,
        leaderId: currentLeaderId,
        positionCode: currentPosition,
        startDate: currentStart || undefined,
        endDate: currentEnd || undefined,
      });
    },
    onSuccess: async () => {
      toast.success("Phân công thành công");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["resource", "/executive-board/assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["resource-kpi", "/executive-board/assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["resource-detail", "/executive-board/assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["executive-board-seats"] }),
      ]);
      onClose();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const canSubmit = Boolean(currentLeaderId && currentPosition) && !dateInvalid && !missingUnit;

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border bg-white p-5 shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Dialog.Title className="text-lg font-semibold text-foreground">Phân công ban điều hành</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">
            {unitType ? `Phân công huynh trưởng vào chức vụ cấp ${LEVEL_LABELS[unitType].toLowerCase()}. Muốn đổi người giữ chức vụ, hãy vô hiệu hóa phân công hiện tại trước.` : "Phân công huynh trưởng vào chức vụ."}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>
      {!scope ? <p className="mt-4 text-sm text-danger">Bạn không có quyền phân công ở cấp nào.</p> : null}
      {missingUnit && scope ? <p className="mt-4 text-sm text-danger">Tài khoản chưa gắn với đơn vị nào để phân công.</p> : null}

      <div className="mt-4 space-y-4">
        <div>
          <span className="mb-1 block text-xs font-semibold text-foreground">
            Huynh trưởng <span className="text-danger">*</span>
          </span>
          <div className="flex items-center gap-3 rounded-[8px] border border-border px-3 py-2">
            <span className={currentLeaderName ? "min-w-0 flex-1 truncate text-sm font-semibold text-foreground" : "min-w-0 flex-1 truncate text-sm text-muted"}>
              {currentLeaderName || "Chưa chọn huynh trưởng"}
            </span>
            <Button onClick={() => setPickerOpen(true)} size="sm" type="button" variant="outline">
              <UsersThree size={16} />
              {currentLeaderId ? "Đổi" : "Chọn"}
            </Button>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-foreground">
            Chức vụ <span className="text-danger">*</span>
          </span>
          <select
            className="h-10 w-full rounded-[8px] border border-border bg-white px-3 text-sm"
            onChange={(event) => setPositionCode(event.target.value)}
            value={currentPosition}
          >
            <option value="">{positions.length ? "Chọn chức vụ" : "Không còn chức vụ trống"}</option>
            {positions.map((row) => (
              <option key={row.positionCode} value={row.positionCode}>
                {row.positionName}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-foreground">Ngày bắt đầu</span>
            <Input onChange={(event) => setStartDate(event.target.value)} type="date" value={currentStart} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-foreground">Ngày kết thúc</span>
            <Input min={currentStart || undefined} onChange={(event) => setEndDate(event.target.value)} type="date" value={currentEnd} />
          </label>
        </div>
        {dateInvalid ? <p className="text-xs text-danger">Ngày kết thúc không được trước ngày bắt đầu.</p> : null}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={!canSubmit} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button">
          Phân công
        </Button>
      </div>

      <LeaderPickerModal
        onClose={() => setPickerOpen(false)}
        onSelect={(picked) => {
          setLeader(picked);
          setPickerOpen(false);
        }}
        open={pickerOpen}
        selectedId={currentLeaderId}
      />
    </Dialog.Content>
  );
}
