"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { UsersThree, X } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { buildBody, initialFormState, parsePositiveInt, sequentialNames, teamCountFor, teamSizeFor, validateForm, type TeamFormState } from "../team-form";
import { unitLabel, type TeamOverview } from "../types";
import { resourceKey } from "@/lib/api/query-keys";

// Cấu hình chia đội: nhập số đội hoặc số hồ sơ mỗi đội (một ô đổi thì ô kia tự tính), cách đặt tên đội và cách chia hồ sơ vào đội.
// Nam / nữ luôn được chia cân bằng; chia lại sẽ ghi đè đội đã chia trước đó.
export function TeamDivideDialog({ courseCode, overview }: { courseCode: string; overview: TeamOverview }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TeamFormState>(() => initialFormState(overview));
  const total = overview.totalParticipants;
  const unit = unitLabel(overview.unitType);
  const teamCount = parsePositiveInt(form.teamCount);
  const error = validateForm(form, overview);

  const divide = useMutation({
    mutationFn: () => apiMutation(`/training/courses/${encodeURIComponent(courseCode)}/teams/divide`, "POST", buildBody(form)),
    onSuccess: async () => {
      toast.success("Chia đội thành công");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: resourceKey() });
    },
  });

  function update(patch: Partial<TeamFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function changeTeamCount(value: string) {
    const count = parsePositiveInt(value);
    update({ teamCount: value, ...(count !== null && total > 0 ? { teamSize: String(teamSizeFor(total, count)) } : {}) });
  }

  function changeTeamSize(value: string) {
    const size = parsePositiveInt(value);
    update({ teamSize: value, ...(size !== null && total > 0 ? { teamCount: String(teamCountFor(total, size)) } : {}) });
  }

  function changeCustomName(index: number, value: string) {
    const names = Array.from({ length: Math.max(teamCount ?? 0, form.customNames.length) }, (_, position) => form.customNames[position] ?? "");
    names[index] = value;
    update({ customNames: names });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setForm(initialFormState(overview));
      }}
    >
      <Dialog.Trigger asChild>
        <Button disabled={total === 0} type="button">
          <UsersThree size={18} />
          {overview.dividedParticipants > 0 ? "Chia lại đội" : "Chia đội"}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,640px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Cấu hình chia đội</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                Chia hồ sơ trong danh sách tham dự vào các đội. Hệ thống tự cân bằng tỉ lệ nam nữ xấp xỉ nhau nhất có thể ở mỗi đội.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto px-5 py-4">
            <dl className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Tổng số hồ sơ" value={total} />
              <Stat label="Nam" value={overview.male} />
              <Stat label="Nữ" value={overview.female} />
            </dl>
            {overview.dividedParticipants > 0 ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] text-foreground">
                Khóa đã chia {overview.teams.length} đội trước đó. Chia lại sẽ ghi đè toàn bộ đội hiện tại.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Số đội cần chia">
                <Input inputMode="numeric" min={1} onChange={(event) => changeTeamCount(event.target.value)} type="number" value={form.teamCount} />
              </Field>
              <Field label="Số hồ sơ mỗi đội (tối đa)">
                <Input inputMode="numeric" min={1} onChange={(event) => changeTeamSize(event.target.value)} type="number" value={form.teamSize} />
              </Field>
            </div>
            <p className="-mt-3 text-xs text-muted">Nhập số đội hoặc số hồ sơ mỗi đội, ô còn lại tự tính. Sĩ số các đội được chia đều, chênh nhau tối đa 1 hồ sơ.</p>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-foreground">Tên đội</legend>
              <Radio checked={form.namingMode === "SEQUENTIAL"} label={`Theo số thứ tự${teamCount ? ` (${sequentialNames(Math.min(teamCount, 3)).join(", ")}${teamCount > 3 ? ", …" : ""})` : ""}`} onChange={() => update({ namingMode: "SEQUENTIAL" })} />
              <Radio checked={form.namingMode === "CUSTOM"} label="Tự nhập tên đội" onChange={() => update({ namingMode: "CUSTOM" })} />
              {form.namingMode === "CUSTOM" && teamCount !== null && teamCount <= 100 ? (
                <div className="grid gap-2 pl-6 sm:grid-cols-2">
                  {Array.from({ length: teamCount }, (_, index) => (
                    <Input aria-label={`Tên đội ${index + 1}`} key={index} maxLength={150} onChange={(event) => changeCustomName(index, event.target.value)} placeholder={`Tên đội ${index + 1}`} value={form.customNames[index] ?? ""} />
                  ))}
                </div>
              ) : null}
              {form.namingMode === "CUSTOM" && teamCount !== null && teamCount > 100 ? <p className="pl-6 text-xs text-muted">Quá 100 đội, hãy dùng tên theo số thứ tự.</p> : null}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-foreground">Cách chia hồ sơ vào đội</legend>
              <Radio checked={form.assignmentMode === "RANDOM"} label="Chia ngẫu nhiên" onChange={() => update({ assignmentMode: "RANDOM" })} />
              <Radio checked={form.assignmentMode === "UNIT_LIMIT"} label={`Mỗi đội có tối đa N ${unit} (hồ sơ cùng ${unit} được xếp gần nhau)`} onChange={() => update({ assignmentMode: "UNIT_LIMIT" })} />
              {form.assignmentMode === "UNIT_LIMIT" ? (
                <div className="flex flex-wrap items-center gap-3 pl-6">
                  <Input aria-label={`Số ${unit} tối đa mỗi đội`} className="w-28" inputMode="numeric" max={overview.activeUnitCount} min={1} onChange={(event) => update({ maxUnits: event.target.value })} type="number" value={form.maxUnits} />
                  <span className="text-xs text-muted">
                    {unit} tối đa trong một đội (hiện có {overview.activeUnitCount} {unit} đang hoạt động)
                  </span>
                </div>
              ) : null}
            </fieldset>

            {error ? (
              <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={error !== null} loading={divide.isPending} onClick={() => divide.mutate()} type="button">
              {overview.dividedParticipants > 0 ? "Chia lại" : "Chia đội"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-1 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Radio({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
      <input checked={checked} className="mt-1 accent-[var(--primary)]" onChange={onChange} type="radio" />
      <span>{label}</span>
    </label>
  );
}
