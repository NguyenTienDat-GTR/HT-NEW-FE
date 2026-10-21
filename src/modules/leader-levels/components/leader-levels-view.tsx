"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, DotsSixVertical, Equals, LinkBreak, LockSimple, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/common/resource/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Tip } from "@/components/ui/tip";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/config/routes/routes";
import { cn } from "@/lib/utils";
import { LEADER_LEVELS_QUERY_KEY, setLeaderLevels, type LeaderLevelItem } from "../leader-level-store";
import { buildRows, moveRow, sameRows, tierNumbers, toTiers, toggleLinked, type LevelRow } from "../reorder";

const MANAGE_KEY = ["leader-levels", "manage"] as const;

type FormTarget = { mode: "create" } | { mode: "edit"; level: LeaderLevelItem };

// Quản lý danh mục cấp độ huynh trưởng. Thứ tự từ trên xuống dưới là từ thấp đến cao:
// để đạt một cấp, huynh trưởng phải đang ở cấp ngay phía trên nó. Kéo thả dòng để đổi thứ tự.
export function LeaderLevelsView({ route }: { route?: RouteConfig }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const canCreate = hasPermissionPrefix(user, "system.leader_level.create.");
  const canUpdate = hasPermissionPrefix(user, "system.leader_level.update.");
  const canDelete = hasPermissionPrefix(user, "system.leader_level.delete.");

  const query = useQuery({
    queryKey: MANAGE_KEY,
    enabled: Boolean(user),
    queryFn: () => apiFetch<LeaderLevelItem[]>("/leader-levels"),
  });
  const levels = useMemo(() => query.data ?? [], [query.data]);
  const systemLevels = levels.filter((level) => level.isSystem);
  const movable = levels.filter((level) => !level.isSystem);
  const serverRows = useMemo(() => buildRows(movable), [movable]);

  // Bố cục đang kéo thả chưa lưu (null = giống máy chủ). Mỗi dòng có cờ "bằng cấp với dòng phía trên".
  const [draft, setDraft] = useState<LevelRow[] | null>(null);
  const editRows = draft ?? serverRows;
  const dirty = draft !== null && !sameRows(draft, serverRows);
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overCode, setOverCode] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaderLevelItem | null>(null);

  const byCode = new Map(levels.map((level) => [level.levelCode, level]));
  // Dòng hiển thị: cấp hệ thống (khởi đầu) rồi các cấp theo bố cục đang chỉnh.
  const display = [
    ...systemLevels.map((level) => ({ level, linked: false, system: true })),
    ...editRows.flatMap((row) => {
      const level = byCode.get(row.code);
      return level ? [{ level, linked: row.linked, system: false }] : [];
    }),
  ];
  const tiers = tierNumbers(display.map((item) => ({ code: item.level.levelCode, linked: item.linked })));
  // Điều kiện của mỗi dòng tính theo bố cục đang chỉnh: các cấp của bậc ngay trước.
  const previousNames = display.map((_, index) => {
    const tier = tiers[index];
    return display.filter((_, other) => tiers[other] === tier - 1).map((item) => item.level.levelName);
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["leader-levels"] });
    // Các nơi dùng nhãn / ô chọn lấy từ danh mục chung nên cập nhật ngay.
    const options = await queryClient.fetchQuery({ queryKey: LEADER_LEVELS_QUERY_KEY, queryFn: () => apiFetch<LeaderLevelItem[]>("/leader-levels/options"), staleTime: 0 });
    setLeaderLevels(options);
  }

  const reorderMutation = useMutation({
    mutationFn: () => apiMutation<LeaderLevelItem[]>("/leader-levels/reorder", "PUT", { tiers: toTiers(editRows) }),
    onSuccess: async () => {
      toast.success("Đã lưu thứ tự cấp độ");
      setDraft(null);
      await refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => apiMutation<void>(`/leader-levels/${encodeURIComponent(code)}`, "DELETE"),
    onSuccess: async () => {
      toast.success("Đã xóa cấp độ");
      setDeleteTarget(null);
      setDraft(null);
      await refresh();
    },
  });

  // Vị trí của dòng trong danh sách có thể chỉnh (không tính cấp hệ thống).
  function editIndex(code: string) {
    return editRows.findIndex((row) => row.code === code);
  }

  function moveBy(code: string, delta: number) {
    const from = editIndex(code);
    setDraft(moveRow(editRows, from, from + delta));
  }

  function handleDrop(targetCode: string) {
    if (dragCode && dragCode !== targetCode) setDraft(moveRow(editRows, editIndex(dragCode), editIndex(targetCode)));
    setDragCode(null);
    setOverCode(null);
  }

  // Ví dụ minh họa lấy từ dữ liệu thật: cấp có điều kiện ở vị trí thứ ba trở đi.
  const exampleIndex = display.findIndex((_, index) => index >= 2 && previousNames[index].length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{route?.title ?? "Cấp độ huynh trưởng"}</h1>
        <p className="mt-1 text-sm text-muted">{route?.subtitle}</p>
      </div>

      <Panel className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">Thang cấp độ của giáo phận</h2>
            <p className="text-sm text-muted">
              Cấp ở <span className="font-semibold text-foreground">phía dưới cao hơn</span> cấp ở phía trên. Để đạt một cấp, huynh trưởng phải đang ở{" "}
              <span className="font-semibold text-foreground">cấp ngay phía trên</span> nó. Các cấp được nối bằng dấu <span className="font-semibold text-foreground">=</span> là bằng cấp nhau, cùng một bậc.
              {exampleIndex >= 0 ? (
                <>
                  {" "}Ví dụ: để đạt <span className="font-semibold text-foreground">{display[exampleIndex].level.levelName}</span> thì phải là{" "}
                  <span className="font-semibold text-foreground">{previousNames[exampleIndex].join(" hoặc ")}</span>.
                </>
              ) : null}
            </p>
            {canUpdate ? <p className="text-xs text-muted">Kéo biểu tượng ⋮⋮ (hoặc dùng mũi tên) để đổi thứ tự, bấm nút giữa hai dòng để cho hai cấp bằng cấp nhau hoặc tách ra, rồi bấm Lưu. Danh mục này chỉ áp dụng cho giáo phận của bạn.</p> : null}
          </div>
          {canCreate ? (
            <Button onClick={() => setFormTarget({ mode: "create" })} size="sm" type="button">
              <Plus size={16} /> Thêm cấp độ
            </Button>
          ) : null}
        </div>

        {query.isError ? <p className="text-sm text-danger">{getApiErrorMessage(query.error)}</p> : null}
        {query.isLoading ? <div className="h-40 rounded-[12px] border border-border bg-white motion-safe:animate-pulse" /> : null}

        <ol className="space-y-0">
          {display.map((item, index) => {
            const level = item.level;
            const previous = index > 0 ? display[index - 1] : undefined;
            const draggable = canUpdate && !item.system;
            const position = editIndex(level.levelCode);
            const names = previousNames[index];
            // Có thể nối / tách bằng cấp với dòng phía trên khi cả hai đều là cấp có thể chỉnh.
            const canLink = canUpdate && previous !== undefined && !previous.system && !item.system;
            return (
              <li key={level.levelCode}>
                {previous ? (
                  <div className="ml-[27px] flex h-8 items-center gap-2 border-l-2 border-dashed border-border pl-4 text-xs text-muted">
                    {item.linked ? <Equals size={12} weight="bold" /> : <ArrowDown size={12} />}
                    <span>{item.linked ? "bằng cấp với cấp phía trên" : "lên cấp"}</span>
                    {canLink ? (
                      <Tip label={item.linked ? "Tách thành bậc riêng" : "Cho bằng cấp với cấp phía trên"}>
                        <button
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-1.5 py-0.5 text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary"
                          onClick={() => setDraft(toggleLinked(editRows, position))}
                          type="button"
                        >
                          {item.linked ? <LinkBreak size={12} /> : <Equals size={12} />}
                          {item.linked ? "Tách" : "Bằng cấp"}
                        </button>
                      </Tip>
                    ) : null}
                  </div>
                ) : null}
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-[12px] border bg-white p-3 transition-colors",
                    overCode === level.levelCode && dragCode && dragCode !== level.levelCode ? "border-primary bg-primary/5" : "border-border",
                    dragCode === level.levelCode && "opacity-50",
                  )}
                  draggable={draggable}
                  onDragEnd={() => {
                    setDragCode(null);
                    setOverCode(null);
                  }}
                  onDragOver={(event) => {
                    if (!dragCode || item.system) return;
                    event.preventDefault();
                    setOverCode(level.levelCode);
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    setDragCode(level.levelCode);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (!item.system) handleDrop(level.levelCode);
                  }}
                >
                  <span
                    className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold", item.system ? "bg-surface-2 text-muted" : "bg-primary/10 text-primary")}
                    title="Bậc của cấp (càng lớn cấp càng cao, cùng số là bằng cấp nhau)"
                  >
                    {tiers[index] - 1}
                  </span>
                  {draggable ? (
                    <span aria-hidden className="cursor-grab text-muted active:cursor-grabbing" title="Kéo để đổi thứ tự">
                      <DotsSixVertical size={20} weight="bold" />
                    </span>
                  ) : (
                    <span aria-hidden className="text-muted" title={item.system ? "Cấp hệ thống, không đổi thứ tự" : undefined}>
                      {item.system ? <LockSimple size={18} /> : <span className="inline-block w-[20px]" />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{level.levelName}</span>
                      <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">{level.levelCode}</code>
                      {item.system ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">Cấp khởi đầu</span> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {names.length > 0 ? (
                        <>Điều kiện: đang là <span className="font-semibold text-foreground">{names.join(" hoặc ")}</span></>
                      ) : (
                        "Chưa đạt cấp nào"
                      )}
                      {(level.courseTypeCount ?? 0) > 0 ? ` · ${level.courseTypeCount} loại khóa` : ""}
                    </p>
                    {level.description ? <p className="mt-0.5 text-xs text-muted">{level.description}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {draggable ? (
                      <>
                        <Button aria-label="Chuyển lên" disabled={position <= 0} onClick={() => moveBy(level.levelCode, -1)} size="icon" type="button" variant="ghost">
                          <ArrowUp size={16} />
                        </Button>
                        <Button aria-label="Chuyển xuống" disabled={position >= editRows.length - 1} onClick={() => moveBy(level.levelCode, 1)} size="icon" type="button" variant="ghost">
                          <ArrowDown size={16} />
                        </Button>
                      </>
                    ) : null}
                    {canUpdate ? (
                      <Tip label="Sửa tên và mô tả">
                        <Button aria-label="Sửa" onClick={() => setFormTarget({ mode: "edit", level })} size="icon" type="button" variant="ghost">
                          <PencilSimple size={16} />
                        </Button>
                      </Tip>
                    ) : null}
                    {canDelete && !item.system ? (
                      <Tip disabled={!level.deletable} label={level.deletable ? "Xóa cấp độ" : "Đang được sử dụng nên không xóa được"}>
                        <Button aria-label="Xóa" className="text-danger" disabled={!level.deletable} onClick={() => setDeleteTarget(level)} size="icon" type="button" variant="ghost">
                          <Trash size={16} />
                        </Button>
                      </Tip>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {dirty ? (
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-warning/40 bg-warning/10 px-4 py-3 shadow-sm">
            <span className="text-sm font-medium text-foreground">Thứ tự / bậc đã thay đổi, chưa lưu. Điều kiện của từng cấp ở trên đã cập nhật theo bố cục mới.</span>
            <div className="flex gap-2">
              <Button onClick={() => setDraft(null)} size="sm" type="button" variant="outline">
                Hoàn tác
              </Button>
              <Button loading={reorderMutation.isPending} onClick={() => reorderMutation.mutate()} size="sm" type="button">
                Lưu thứ tự
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      <LevelFormDialog
        onClose={() => setFormTarget(null)}
        onSaved={async () => {
          setFormTarget(null);
          setDraft(null);
          await refresh();
        }}
        target={formTarget}
      />
      <ConfirmActionDialog
        action="withdraw"
        confirmLabel="Xóa"
        description={deleteTarget ? `Xóa cấp độ "${deleteTarget.levelName}" khỏi danh mục. Cấp độ chưa được dùng ở đâu nên việc xóa không ảnh hưởng dữ liệu.` : undefined}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.levelCode)}
        open={deleteTarget !== null}
        requireConfirmText={false}
        title="Xóa cấp độ"
      />
    </div>
  );
}

function LevelFormDialog({ target, onClose, onSaved }: { target: FormTarget | null; onClose: () => void; onSaved: () => Promise<void> }) {
  return (
    <Dialog.Root open={target !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        {/* key để xóa dữ liệu đã nhập khi mở lại cho cấp khác. */}
        {target ? <LevelForm key={target.mode === "edit" ? target.level.levelCode : "create"} onClose={onClose} onSaved={onSaved} target={target} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LevelForm({ target, onClose, onSaved }: { target: FormTarget; onClose: () => void; onSaved: () => Promise<void> }) {
  const editing = target.mode === "edit";
  const [name, setName] = useState(editing ? target.level.levelName : "");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState(editing ? (target.level.description ?? "") : "");

  const mutation = useMutation({
    mutationFn: () =>
      editing
        ? apiMutation(`/leader-levels/${encodeURIComponent(target.level.levelCode)}`, "PUT", { levelName: name.trim(), description: description.trim() || null })
        : apiMutation("/leader-levels", "POST", { levelName: name.trim(), levelCode: code.trim() || undefined, description: description.trim() || null }),
    onSuccess: async () => {
      toast.success(editing ? "Đã cập nhật cấp độ" : "Đã thêm cấp độ (nằm trên cùng, kéo thả để đổi vị trí)");
      await onSaved();
    },
  });

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border bg-white p-5 shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Dialog.Title className="text-lg font-semibold text-foreground">{editing ? "Sửa cấp độ" : "Thêm cấp độ"}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">
            {editing ? `Mã cấp độ ${target.level.levelCode} không đổi được.` : "Cấp mới nằm trên cùng thang cấp, kéo thả để đặt đúng vị trí."}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-foreground">Tên cấp độ <span className="text-danger">*</span></span>
          <Input autoFocus onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Huynh trưởng cấp IV" value={name} />
        </label>
        {!editing ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-foreground">Mã cấp độ</span>
            <Input onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Để trống để tự tạo từ tên" value={code} />
            <span className="mt-1 block text-xs text-muted">Chữ hoa, số, gạch dưới; không đổi được sau khi tạo.</span>
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-foreground">Mô tả</span>
          <Input onChange={(event) => setDescription(event.target.value)} placeholder="Không bắt buộc" value={description} />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={!name.trim()} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button">
          {editing ? "Lưu" : "Thêm"}
        </Button>
      </div>
    </Dialog.Content>
  );
}
