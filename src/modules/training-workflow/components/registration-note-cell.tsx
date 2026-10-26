"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiMutation } from "@/lib/api/client";

// Ghi chú của hồ sơ đăng ký: người có quyền sửa tại chỗ (lưu khi rời ô nhập), người khác chỉ xem.
export function RegistrationNoteCell({ row, editable }: { row: Record<string, unknown>; editable: boolean }) {
  const queryClient = useQueryClient();
  const original = typeof row.registrationNote === "string" ? row.registrationNote : "";
  const id = String(row.id ?? "");
  const [draft, setDraft] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (note: string) => apiMutation(`/training/participations/${encodeURIComponent(id)}/registration-note`, "PATCH", { note }),
    onSuccess: async () => {
      toast.success("Đã lưu ghi chú");
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
    },
  });

  if (!editable) {
    return original ? (
      <span className="block max-w-[260px] truncate text-sm text-foreground" title={original}>
        {original}
      </span>
    ) : (
      <span className="text-muted">—</span>
    );
  }
  const value = draft ?? original;
  return (
    <input
      aria-label={`Ghi chú của ${String(row.leaderFullName ?? "")}`}
      className="h-8 w-full min-w-[160px] max-w-[280px] rounded-[6px] border border-border bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] disabled:opacity-60"
      disabled={save.isPending}
      maxLength={1000}
      onBlur={() => {
        if (draft !== null && draft.trim() !== original.trim()) save.mutate(draft.trim());
        else setDraft(null);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setDraft(null);
      }}
      placeholder="Thêm ghi chú"
      value={value}
    />
  );
}
