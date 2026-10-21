"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

const POSITION_TYPES = [
  { value: "DIOCESE", label: "Giáo phận" },
  { value: "DEANERY", label: "Giáo hạt" },
  { value: "PARISH", label: "Giáo xứ" },
] as const;

type PositionFormTarget = { mode: "create" } | { mode: "edit"; id: string };

// Chỉ hiện các cấp thuộc phạm vi tài khoản được tạo/sửa (BE vẫn kiểm tra lại).
function managedPositionTypes(user: Parameters<typeof hasPermission>[0], action: "create" | "update") {
  return POSITION_TYPES.filter((type) => hasPermission(user, `organization.position.${action}.${type.value.toLowerCase()}`));
}

export function PositionFormDialog({ target, onClose }: { target: PositionFormTarget | null; onClose: () => void }) {
  return (
    <Dialog.Root open={target !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        {/* key để xóa dữ liệu đã nhập khi mở lại cho chức vụ khác. */}
        {target ? <PositionForm key={target.mode === "edit" ? target.id : "create"} onClose={onClose} target={target} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PositionForm({ target, onClose }: { target: PositionFormTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const editing = target.mode === "edit";
  const allowedTypes = managedPositionTypes(user, editing ? "update" : "create");
  const detailQuery = useQuery({
    queryKey: ["resource-detail", "/positions", editing ? target.id : null],
    enabled: editing,
    queryFn: () => apiFetch<{ positionName?: string; positionType?: string }>(`/positions/${encodeURIComponent(editing ? target.id : "")}`),
  });
  const [name, setName] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();

  const currentName = name ?? detailQuery.data?.positionName ?? "";
  // Chỉ có một cấp được phép thì chọn sẵn cấp đó.
  const currentType = type ?? detailQuery.data?.positionType ?? (allowedTypes.length === 1 ? allowedTypes[0]?.value : undefined) ?? "";
  const typeAllowed = allowedTypes.some((item) => item.value === currentType);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { positionName: currentName.trim(), positionType: currentType };
      return editing ? apiMutation(`/positions/${encodeURIComponent(target.id)}`, "PUT", payload) : apiMutation("/positions", "POST", payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Lưu cập nhật thành công" : "Tạo mới thành công");
      // Danh sách, KPI, chi tiết và các ô chọn chức vụ ở form khác đều phải lấy lại dữ liệu mới.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["resource", "/positions"] }),
        queryClient.invalidateQueries({ queryKey: ["resource-kpi", "/positions"] }),
        queryClient.invalidateQueries({ queryKey: ["resource-detail", "/positions"] }),
        queryClient.invalidateQueries({ queryKey: ["field-options"] }),
      ]);
      onClose();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border bg-white p-5 shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Dialog.Title className="text-lg font-semibold text-foreground">{editing ? "Chỉnh sửa chức vụ" : "Thêm chức vụ"}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">Chức vụ theo cấp áp dụng trong ban điều hành.</Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>
      {detailQuery.isError ? <p className="mt-4 text-sm text-danger">{getApiErrorMessage(detailQuery.error)}</p> : null}
      {allowedTypes.length === 0 ? <p className="mt-4 text-sm text-danger">Bạn không có quyền quản lý chức vụ ở cấp nào.</p> : null}
      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-foreground">
            Tên chức vụ <span className="text-danger">*</span>
          </span>
          <Input autoFocus disabled={editing && detailQuery.isLoading} onChange={(event) => setName(event.target.value)} value={currentName} />
        </label>
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-foreground">
            Loại chức vụ <span className="text-danger">*</span>
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {allowedTypes.map((option) => (
              <label
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] border px-2.5 py-1.5 text-sm font-semibold transition-colors",
                  currentType === option.value ? "border-primary bg-primary/8 text-primary" : "border-border bg-white text-foreground",
                )}
                key={option.value}
              >
                <input checked={currentType === option.value} className="h-4 w-4 accent-primary" name="positionType" onChange={() => setType(option.value)} type="radio" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={!currentName.trim() || !typeAllowed} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button">
          {editing ? "Lưu cập nhật" : "Tạo mới"}
        </Button>
      </div>
    </Dialog.Content>
  );
}
