"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/common/resource/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { apiFetch, apiMutation, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";

type ParishOption = { id: string; name: string };

// Admin giáo hạt / giáo phận (có quyền tạo giáo xứ trong phạm vi) đổi giáo xứ cha của giáo họ / giáo điểm, trong cùng giáo hạt.
// Huynh trưởng và tài khoản vẫn gắn vào chính giáo họ / giáo điểm nên phạm vi quyền của họ không đổi.
export function ParentParishCard({ id, row }: { id: string; row: Record<string, unknown> }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const deaneryId = typeof row.deaneryId === "string" ? row.deaneryId : "";
  const currentParentId = typeof row.parentParishId === "string" ? row.parentParishId : "";
  const [selected, setSelected] = useState(currentParentId);
  const [confirmPromote, setConfirmPromote] = useState(false);
  const canChange = canChangeParentParish(user?.roles, hasPermissionPrefix(user, "organization.parish.create."));

  const optionsQuery = useQuery({
    queryKey: ["parent-parish-options", deaneryId],
    enabled: canChange && deaneryId !== "",
    queryFn: () => {
      const filters = encodeURIComponent(JSON.stringify({ "deanery.id": deaneryId, unitType: "PARISH" }));
      return apiFetch<PageResponse<ParishOption>>(`/parishes?filters=${filters}&page=0&size=100`);
    },
  });
  const options = optionsQuery.data?.content ?? [];

  const mutation = useMutation({
    mutationFn: () => apiMutation(`/parishes/${encodeURIComponent(id)}/parent`, "PATCH", { parentParishId: selected }),
    onSuccess: async () => {
      toast.success("Đã đổi giáo xứ cha");
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const promote = useMutation({
    mutationFn: () => apiMutation(`/parishes/${encodeURIComponent(id)}/promote`, "PATCH"),
    onSuccess: async () => {
      toast.success("Đã chuyển thành giáo xứ");
      setConfirmPromote(false);
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!canChange) return null;

  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Giáo xứ cha</h2>
      <p className="mt-1 text-xs text-muted">Chỉ chọn được giáo xứ cùng giáo hạt. Giáo xứ cha chỉ để phân loại; huynh trưởng và admin của giáo họ / giáo điểm không đổi.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="Giáo xứ cha"
          className="h-10 min-w-56 rounded-lg border border-border bg-white px-3 text-sm"
          onChange={(event) => setSelected(event.target.value)}
          value={selected}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <Button disabled={!selected || selected === currentParentId} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button" variant="primary">
          Đổi giáo xứ cha
        </Button>
        <Button onClick={() => setConfirmPromote(true)} type="button" variant="outline">
          Chuyển thành giáo xứ
        </Button>
      </div>
      <ConfirmActionDialog
        action="toggle"
        confirmLabel="Chuyển thành giáo xứ"
        description="Đơn vị trở thành giáo xứ độc lập, không còn thuộc giáo xứ cha. Huynh trưởng và tài khoản giữ nguyên. Nhập chính xác Xác nhận để thực hiện."
        loading={promote.isPending}
        onClose={() => setConfirmPromote(false)}
        onConfirm={() => promote.mutate()}
        open={confirmPromote}
        title="Chuyển thành giáo xứ"
      />
    </section>
  );
}

export function canChangeParentParish(roles: string[] | undefined, hasCreatePermission: boolean) {
  return hasCreatePermission && !(roles ?? []).includes("SUPER_ADMIN");
}
