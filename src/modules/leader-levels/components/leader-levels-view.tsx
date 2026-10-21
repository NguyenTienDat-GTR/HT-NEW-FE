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
import { buildRows, firstTierBase, moveRow, sameRows, tierNumbers, toTiers, toggleLinked, type LevelRow } from "../reorder";

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
  // displayOrder của các cấp khởi đầu (cấp hệ thống): cấp movable cùng số này là bằng cấp với cấp khởi đầu.
  const systemOrders = useMemo(() => new Set(systemLevels.map((level) => level.displayOrder)), [systemLevels]);
  const serverRows = useMemo(() => buildRows(movable, systemOrders), [movable, systemOrders]);

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
    mutationFn: () => apiMutation<LeaderLevelItem[]>("/leader-levels/reorder", "PUT", { tiers: toTiers(editRows), firstTierBase: firstTierBase(editRows) }),
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

  // Thẻ của một cấp trong thang. Nút quan hệ nằm ngay trên thẻ của cấp đó để khỏi nhầm thuộc về cấp nào:
  // `showSplit` = cấp này đang bằng cấp với cấp trên trong cùng khung nên có thể tách ra;
  // `linkUp` = cấp này là đầu một bậc và có thể cho bằng cấp với bậc ngay trên (hoặc với cấp khởi đầu nếu `toBase`).
  function renderCard({ item, index, showSplit, linkUp }: { item: (typeof display)[number]; index: number; showSplit: boolean; linkUp: { toBase: boolean } | null }) {
    const level = item.level;
    const draggable = canUpdate && !item.system;
    const position = editIndex(level.levelCode);
    const names = previousNames[index];
    return (
      <div
        key={level.levelCode}
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-white p-3 transition-colors",
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
          {showSplit ? (
            <Tip label="Tách cấp này thành một bậc riêng (không còn bằng cấp)">
              <Button aria-label="Tách khỏi bậc" onClick={() => setDraft(toggleLinked(editRows, position))} size="sm" type="button" variant="outline">
                <LinkBreak size={14} /> Tách
              </Button>
            </Tip>
          ) : null}
          {linkUp ? (
            <Tip label={linkUp.toBase ? "Cho cấp này ngang với cấp khởi đầu (cùng bậc, không cần cấp trước)" : "Cho cấp này bằng cấp với bậc ngay trên (gộp vào cùng một bậc)"}>
              <Button aria-label="Bằng cấp với bậc trên" onClick={() => setDraft(toggleLinked(editRows, position))} size="sm" type="button" variant="outline">
                <Equals size={14} /> {linkUp.toBase ? "Ngang cấp khởi đầu" : "Bằng cấp bậc trên"}
              </Button>
            </Tip>
          ) : null}
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
    );
  }

  // Ví dụ minh họa lấy từ dữ liệu thật: cấp có điều kiện ở vị trí thứ ba trở đi.
  const exampleIndex = display.findIndex((_, index) => index >= 2 && previousNames[index].length > 0);

  // Gộp các dòng cùng bậc thành một khối để thấy rõ các cấp bằng cấp nhau nằm chung một bậc.
  const groups: { tier: number; system: boolean; items: { item: (typeof display)[number]; index: number }[] }[] = [];
  display.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (last && last.tier === tiers[index]) last.items.push({ item, index });
    else groups.push({ tier: tiers[index], system: item.system, items: [{ item, index }] });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-8 text-foreground">{route?.title ?? "Cấp độ huynh trưởng"}</h1>
        <p className="mt-1 text-sm text-muted">{route?.subtitle}</p>
      </div>

      <Panel className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">Thang cấp độ của giáo phận</h2>
            <p className="text-sm text-muted">
              Thang xếp từ <span className="font-semibold text-foreground">thấp (trên)</span> đến <span className="font-semibold text-foreground">cao (dưới)</span>. Mỗi{" "}
              <span className="font-semibold text-foreground">bậc</span> là một nấc trên thang. Các cấp nằm chung một{" "}
              <span className="font-semibold text-primary">khung màu</span> là <span className="font-semibold text-foreground">bằng cấp nhau</span> — cùng một bậc, giá trị như nhau. Để lên bậc kế tiếp, huynh trưởng phải đang ở{" "}
              <span className="font-semibold text-foreground">một trong các cấp của bậc ngay dưới</span> nó. Một cấp cũng có thể{" "}
              <span className="font-semibold text-foreground">ngang với cấp khởi đầu</span> (không cần cấp nào trước đó).
              {exampleIndex >= 0 ? (
                <>
                  {" "}Ví dụ: để đạt <span className="font-semibold text-foreground">{display[exampleIndex].level.levelName}</span> thì phải là{" "}
                  <span className="font-semibold text-foreground">{previousNames[exampleIndex].join(" hoặc ")}</span>.
                </>
              ) : null}
            </p>
            {canUpdate ? <p className="text-xs text-muted">Kéo biểu tượng ⋮⋮ (hoặc dùng mũi tên) để đổi thứ tự. Trên mỗi thẻ cấp có nút <span className="font-semibold text-foreground">Bằng cấp bậc trên</span> (hoặc <span className="font-semibold text-foreground">Ngang cấp khởi đầu</span>) để cho bằng cấp, và nút <span className="font-semibold text-foreground">Tách</span> để đưa cấp ra bậc riêng, rồi bấm Lưu. Danh mục này chỉ áp dụng cho giáo phận của bạn.</p> : null}
          </div>
          {canCreate ? (
            <Button onClick={() => setFormTarget({ mode: "create" })} size="sm" type="button">
              <Plus size={16} /> Thêm cấp độ
            </Button>
          ) : null}
        </div>

        {query.isError ? <p className="text-sm text-danger">{getApiErrorMessage(query.error)}</p> : null}
        {query.isLoading ? <div className="h-40 rounded-xl border border-border bg-white motion-safe:animate-pulse" /> : null}

        <div className="space-y-0">
          {groups.map((group, groupIndex) => {
            const multi = group.items.length > 1;
            const firstLevel = group.items[0].item.level;
            const prevGroup = groupIndex > 0 ? groups[groupIndex - 1] : undefined;
            // Đầu bậc này có thể cho bằng cấp với bậc ngay trên (hoặc với cấp khởi đầu nếu bậc trên là cấp hệ thống).
            const canLinkUp = canUpdate && prevGroup !== undefined && !group.system;
            return (
              <div key={firstLevel.levelCode}>
                {groupIndex > 0 ? (
                  <div className="flex items-center gap-2 py-2 pl-[68px] text-xs text-muted">
                    <ArrowDown size={14} weight="bold" className="text-primary" />
                    <span className="font-medium">lên cấp</span>
                  </div>
                ) : null}
                <div className="flex gap-3">
                  <div className="flex w-14 shrink-0 flex-col items-center pt-3">
                    <span
                      className={cn("grid h-9 w-9 place-items-center rounded-full text-sm font-semibold", group.system ? "bg-surface-2 text-muted" : "bg-primary/10 text-primary")}
                      title={group.system ? "Cấp khởi đầu" : "Bậc trên thang (càng lớn càng cao; cùng bậc là bằng cấp nhau)"}
                    >
                      {group.system ? <LockSimple size={16} /> : group.tier - 1}
                    </span>
                    <span className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">{group.system ? "Khởi đầu" : "Bậc"}</span>
                  </div>
                  <div className={cn("min-w-0 flex-1 rounded-xl", multi ? "border-2 border-primary/40 bg-primary/[0.04] p-2" : "")}>
                    {multi ? (
                      <div className="flex items-center gap-1.5 px-1 pb-2 pt-1 text-xs font-semibold text-primary">
                        <Equals size={14} weight="bold" />
                        <span>{group.items.length} cấp bằng cấp nhau — cùng một bậc</span>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {group.items.map(({ item, index }, itemIndex) =>
                        renderCard({
                          item,
                          index,
                          showSplit: canUpdate && multi && itemIndex > 0,
                          linkUp: itemIndex === 0 && canLinkUp ? { toBase: Boolean(prevGroup?.system) } : null,
                        }),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {dirty ? (
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 shadow-sm">
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
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
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
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
