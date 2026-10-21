"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { rowsFromResponse } from "@/components/form/resource-form/api-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";

export type PermissionRevokeKind = "role" | "account";

type RevocablePermission = { permissionCode: string; permissionName?: string | null; description?: string | null };

const CONFIG = {
  role: {
    title: "Thu hồi quyền của vai trò",
    description: "Chọn vai trò rồi tick các quyền cần thu hồi. Quyền được gỡ khỏi vai trò và có thể phân lại sau.",
    targetLabel: "Vai trò",
    targetPlaceholder: "Chọn vai trò",
    endpoint: "/system/role-permissions",
    targetParam: "roleCode",
    resourceKey: "/system/role-permissions",
  },
  account: {
    title: "Thu hồi quyền của tài khoản",
    description: "Chọn tài khoản rồi tick các quyền riêng cần thu hồi. Quyền được gỡ khỏi tài khoản và có thể phân lại sau.",
    targetLabel: "Tài khoản",
    targetPlaceholder: "Chọn tài khoản",
    endpoint: "/system/account-permissions",
    targetParam: "username",
    resourceKey: "/system/account-permissions",
  },
} as const;

// Thu hồi nhiều quyền đã phân cho vai trò / tài khoản: chọn đối tượng, tick quyền, xác nhận.
export function PermissionRevokeDialog({ kind, open, onClose }: { kind: PermissionRevokeKind; open: boolean; onClose: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        {open ? <RevokeForm kind={kind} onClose={onClose} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RevokeForm({ kind, onClose }: { kind: PermissionRevokeKind; onClose: () => void }) {
  const config = CONFIG[kind];
  const queryClient = useQueryClient();
  const [target, setTarget] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const debouncedTargetSearch = useDebouncedValue(targetSearch).trim();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const targetsQuery = useQuery({
    queryKey: ["revoke-targets", kind, debouncedTargetSearch],
    queryFn: () =>
      apiFetch<unknown>(
        kind === "role"
          ? "/system/roles?page=0&size=100"
          : `/system/accounts/permission-targets?page=0&size=50${debouncedTargetSearch ? `&search=${encodeURIComponent(debouncedTargetSearch)}` : ""}`,
      ),
  });
  const targets = rowsFromResponse(targetsQuery.data as never).map((row) => ({
    value: String(kind === "role" ? row.roleCode : row.username),
    label: String(kind === "role" ? (row.roleName ?? row.roleCode) : row.username),
  }));

  const permissionsQuery = useQuery({
    queryKey: ["revocable-permissions", kind, target],
    enabled: Boolean(target),
    queryFn: () => apiFetch<RevocablePermission[]>(`${config.endpoint}/revocable-permissions?${config.targetParam}=${encodeURIComponent(target)}`),
  });
  const permissions = permissionsQuery.data ?? [];
  const keyword = filter.trim().toLowerCase();
  const visible = permissions.filter((permission) => !keyword || `${permission.permissionName ?? ""} ${permission.permissionCode}`.toLowerCase().includes(keyword));
  const allVisibleSelected = visible.length > 0 && visible.every((permission) => selected.includes(permission.permissionCode));

  const mutation = useMutation({
    mutationFn: () => apiMutation<number>(`${config.endpoint}/revoke`, "POST", { [config.targetParam]: target, permissionCodes: selected }),
    onSuccess: async () => {
      toast.success(`Đã thu hồi ${selected.length} quyền`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["resource", config.resourceKey] }),
        queryClient.invalidateQueries({ queryKey: ["resource-detail", config.resourceKey] }),
        queryClient.invalidateQueries({ queryKey: ["revocable-permissions"] }),
        queryClient.invalidateQueries({ queryKey: ["field-options"] }),
      ]);
      onClose();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function toggle(code: string) {
    setSelected((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  function toggleVisible() {
    setSelected((current) => {
      const visibleCodes = visible.map((permission) => permission.permissionCode);
      return allVisibleSelected ? current.filter((code) => !visibleCodes.includes(code)) : Array.from(new Set([...current, ...visibleCodes]));
    });
  }

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[14px] border border-border bg-white shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <Dialog.Title className="text-lg font-semibold text-foreground">{config.title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">{config.description}</Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button aria-label="Đóng" size="icon" variant="ghost">
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <span className="mb-1 block text-xs font-semibold text-foreground">
            {config.targetLabel} <span className="text-danger">*</span>
          </span>
          {kind === "account" ? (
            <Input className="mb-2" onChange={(event) => setTargetSearch(event.target.value)} placeholder="Nhập tên đăng nhập để tìm nhanh" value={targetSearch} />
          ) : null}
          <select
            className="h-10 w-full rounded-[8px] border border-border bg-white px-3 text-sm"
            onChange={(event) => {
              setTarget(event.target.value);
              setSelected([]);
            }}
            value={target}
          >
            <option value="">{targetsQuery.isLoading ? "Đang tải..." : config.targetPlaceholder}</option>
            {targets.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {target ? (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">Quyền đã phân ({permissions.length})</span>
              {visible.length ? (
                <button className="cursor-pointer text-xs font-semibold text-primary" onClick={toggleVisible} type="button">
                  {allVisibleSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              ) : null}
            </div>
            <div className="relative mb-2">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <Input className="pl-9" onChange={(event) => setFilter(event.target.value)} placeholder="Tìm quyền" value={filter} />
            </div>
            {permissionsQuery.isLoading ? <div className="h-24 rounded-[10px] bg-surface-2 motion-safe:animate-pulse" /> : null}
            {permissionsQuery.isError ? <p className="text-sm text-danger">{getApiErrorMessage(permissionsQuery.error)}</p> : null}
            {permissionsQuery.data && permissions.length === 0 ? <p className="text-sm text-muted">Không có quyền nào bạn được phép thu hồi ở {kind === "role" ? "vai trò" : "tài khoản"} này.</p> : null}
            {visible.length ? (
              <ul className="max-h-[320px] divide-y divide-border overflow-y-auto rounded-[10px] border border-border">
                {visible.map((permission) => {
                  const checked = selected.includes(permission.permissionCode);
                  return (
                    <li key={permission.permissionCode}>
                      <label className={cn("flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-primary/5", checked && "bg-primary/8")}>
                        <input checked={checked} className="mt-1 h-4 w-4 accent-primary" onChange={() => toggle(permission.permissionCode)} type="checkbox" />
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground">{permission.permissionName ?? permission.permissionCode}</span>
                          {permission.description ? <span className="block text-xs text-muted">{permission.description}</span> : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border p-4">
        <span className="text-sm text-muted">{selected.length ? `Đã chọn ${selected.length} quyền` : "Chưa chọn quyền nào"}</span>
        <div className="flex gap-3">
          <Button onClick={onClose} type="button" variant="outline">
            Hủy
          </Button>
          <Button disabled={!target || selected.length === 0} loading={mutation.isPending} onClick={() => mutation.mutate()} type="button" variant="primary">
            Thu hồi quyền
          </Button>
        </div>
      </div>
    </Dialog.Content>
  );
}
