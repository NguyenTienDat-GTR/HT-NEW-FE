"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowClockwise, ArrowCounterClockwise, ClockCounterClockwise, Copy, Star, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { apiFetch, apiMutation, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { useSessionState } from "@/lib/use-session-state";
import type { RouteConfig } from "@/config/routes/routes";
import { useUndoHistory } from "@/modules/certificates/undo-history";
import { SCOPE_LABELS, useCertificateFonts, type FieldCatalogItem } from "@/modules/certificates/components/certificate-design";
import {
  MAX_NAME_LENGTH,
  badgePayload,
  blankBadgeForm,
  formFromBadgeConfig,
  isSameBadgeForm,
  validateBadgeForm,
  type BadgeConfig,
  type BadgeForm,
} from "../badge-design";
import { BadgeCardSettings } from "./badge-card-settings";
import { BadgeEditor } from "./badge-editor";
import { BadgeLibrary, EMPTY_LIBRARY_FILTERS, buildLibraryParams, type LibraryFilters } from "./badge-library";
import { Callout } from "./form-controls";

const NEW_CONFIG = "__new__";
const QUERY_KEY = "badge-config";

// Cấu hình thẻ tham dự khóa huấn luyện: thư viện + trình thiết kế (khổ thẻ, mặt trước / sau, ảnh nền, trường mail merge, mã QR).
export function BadgeConfigView({ route }: { route?: RouteConfig }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const canCreate = hasPermissionPrefix(user, "training.badge_config.create.");
  const canUpdate = hasPermissionPrefix(user, "training.badge_config.update.");
  const canDelete = hasPermissionPrefix(user, "training.badge_config.delete.");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const history = useUndoHistory<BadgeForm>(blankBadgeForm());
  const form = history.value;

  useCertificateFonts();

  const optionsQuery = useQuery({
    queryKey: [QUERY_KEY, "options"],
    enabled: Boolean(user),
    queryFn: () => apiFetch<BadgeConfig[]>("/badges/config/options"),
  });
  const fieldsQuery = useQuery({
    queryKey: [QUERY_KEY, "fields"],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: () => apiFetch<FieldCatalogItem[]>("/badges/config/fields"),
  });

  const [searchInput, setSearchInput] = useSessionState("badge-library:searchInput", "");
  const [search, setSearch] = useSessionState("badge-library:search", "");
  const [filters, setFilters] = useSessionState<LibraryFilters>("badge-library:filters", EMPTY_LIBRARY_FILTERS);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput, setSearch]);

  const libraryParams = useMemo(() => buildLibraryParams({ search, filters, page }), [search, filters, page]);
  const libraryQuery = useQuery({
    queryKey: [QUERY_KEY, "list", libraryParams],
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    queryFn: () => apiFetch<PageResponse<BadgeConfig>>(`/badges/config?${libraryParams}`),
  });

  const configs = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data]);
  const defaultConfig = configs.find((config) => config.isDefault && config.editable) ?? configs.find((config) => config.isDefault) ?? null;
  const resolvedId = !optionsQuery.data
    ? null
    : selectedId === NEW_CONFIG
      ? NEW_CONFIG
      : selectedId && configs.some((config) => config.id === selectedId)
        ? selectedId
        : (defaultConfig?.id ?? configs[0]?.id ?? NEW_CONFIG);
  const isNew = resolvedId === NEW_CONFIG;

  const detailQuery = useQuery({
    queryKey: [QUERY_KEY, "detail", resolvedId],
    enabled: Boolean(user) && Boolean(resolvedId) && !isNew,
    queryFn: () => apiFetch<BadgeConfig>(`/badges/config/${resolvedId}`),
  });
  const selectedConfig = !isNew && detailQuery.data?.id === resolvedId ? detailQuery.data : null;

  const baseline = useMemo(() => (selectedConfig ? formFromBadgeConfig(selectedConfig) : blankBadgeForm()), [selectedConfig]);
  const dirty = !isSameBadgeForm(form, baseline);

  // Nạp form khi đổi cấu hình đang mở (xóa lịch sử hoàn tác), sau khi chi tiết đã tải xong.
  if (resolvedId && loadedKey !== resolvedId && (isNew || selectedConfig)) {
    setLoadedKey(resolvedId);
    history.load(baseline);
  }
  const ready = Boolean(resolvedId) && loadedKey === resolvedId;

  const canEditCurrent = isNew ? canCreate : canUpdate && Boolean(selectedConfig?.editable);
  const errors = useMemo(() => validateBadgeForm(form), [form]);

  function updateForm(patch: Partial<BadgeForm>, key?: string) {
    history.set((current) => ({ ...current, ...patch }), key);
  }

  // Ctrl+Z hoàn tác, Ctrl+Y / Ctrl+Shift+Z làm lại; không chặn hoàn tác gốc của ô nhập văn bản.
  const { undo, redo } = history;
  useEffect(() => {
    if (!canEditCurrent) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "y" || (key === "z" && event.shiftKey);
      if (!isUndo && !isRedo) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const nonText = ["checkbox", "radio", "color", "range", "button", "file", "number"];
        const isTextField = target.isContentEditable || target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && !nonText.includes((target as HTMLInputElement).type));
        if (isTextField) return;
      }
      event.preventDefault();
      if (isUndo) undo();
      else redo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEditCurrent, undo, redo]);

  function confirmDiscard() {
    return !dirty || window.confirm("Bạn có thay đổi chưa lưu ở cấu hình đang mở. Bỏ thay đổi và tiếp tục?");
  }

  function selectConfig(id: string) {
    if (id === resolvedId || !confirmDiscard()) return;
    setSelectedId(id);
  }

  function startNew() {
    if (!confirmDiscard()) return;
    setSelectedId(NEW_CONFIG);
    setLoadedKey(null);
  }

  function restoreSaved() {
    if (!dirty) return;
    if (!window.confirm(isNew ? "Xóa toàn bộ nội dung đang soạn?" : "Khôi phục về bản đã lưu? Các thay đổi chưa lưu sẽ mất (vẫn có thể hoàn tác bằng Ctrl+Z).")) return;
    history.set(() => baseline);
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }

  function notifyRenamed(requested: string, saved: BadgeConfig) {
    if (requested && saved.name !== requested) toast.message(`Tên "${requested}" đã tồn tại nên được lưu là "${saved.name}".`);
  }

  const saveMutation = useMutation({
    mutationFn: () => (isNew ? apiMutation<BadgeConfig>("/badges/config", "POST", badgePayload(form)) : apiMutation<BadgeConfig>(`/badges/config/${resolvedId}`, "PUT", badgePayload(form))),
    onSuccess: async (saved) => {
      toast.success("Lưu cấu hình thẻ tham dự thành công");
      notifyRenamed(form.name.trim(), saved);
      await refresh();
      history.load(formFromBadgeConfig(saved));
      if (isNew) setSelectedId(saved.id);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const saveAsNewMutation = useMutation({
    mutationFn: () => apiMutation<BadgeConfig>("/badges/config", "POST", { ...badgePayload(form), name: form.name.trim() || "Cấu hình thẻ tham dự" }),
    onSuccess: async (saved) => {
      toast.success(`Đã tạo cấu hình mới "${saved.name}"`);
      await refresh();
      history.load(formFromBadgeConfig(saved));
      setSelectedId(saved.id);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => apiMutation<BadgeConfig>(`/badges/config/${resolvedId}/default`, "PUT"),
    onSuccess: async () => {
      toast.success("Đã đặt làm cấu hình chung");
      await refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiMutation<void>(`/badges/config/${resolvedId}`, "DELETE"),
    onSuccess: async () => {
      toast.success("Đã xóa cấu hình thẻ tham dự");
      await refresh();
      setSelectedId(null);
      setLoadedKey(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function setAsDefault() {
    if (!selectedConfig) return;
    const note = dirty ? " (Chỉ áp dụng bản đã lưu, thay đổi chưa lưu không được tính.)" : "";
    if (!window.confirm(`Đặt "${selectedConfig.name}" làm cấu hình chung? Khóa huấn luyện xuất thẻ sẽ dùng cấu hình này nếu không chọn cấu hình khác.${note}`)) return;
    setDefaultMutation.mutate();
  }

  function deleteConfig() {
    if (!selectedConfig) return;
    if (!window.confirm(`Xóa cấu hình "${selectedConfig.name}"?\n\nThẻ đã xuất ra PDF không bị thay đổi; các lần xuất sau sẽ dùng cấu hình khác.`)) return;
    deleteMutation.mutate();
  }

  const busy = saveMutation.isPending || saveAsNewMutation.isPending || setDefaultMutation.isPending || deleteMutation.isPending;
  const nameTooLong = form.name.length > MAX_NAME_LENGTH;
  const invalid = errors.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold leading-7 text-foreground">{route?.title ?? "Cấu hình thẻ tham dự"}</h1>
        {route?.subtitle ? <HelpTip label="Mô tả màn hình">{route.subtitle}</HelpTip> : null}
      </div>

      <BadgeLibrary
        activeId={resolvedId}
        canCreate={canCreate}
        error={libraryQuery.isError ? getApiErrorMessage(libraryQuery.error) : null}
        filters={filters}
        isNew={isNew}
        items={libraryQuery.data?.content ?? []}
        loading={libraryQuery.isLoading}
        onCreate={startNew}
        onFiltersChange={(patch) => {
          setFilters((current) => ({ ...current, ...patch }));
          setPage(0);
        }}
        onPageChange={setPage}
        onSearchChange={setSearchInput}
        onSelect={selectConfig}
        page={page}
        placeholder={libraryQuery.isPlaceholderData}
        searchInput={searchInput}
        totalElements={libraryQuery.data?.totalElements ?? 0}
        totalPages={libraryQuery.data?.totalPages ?? 0}
      />

      {!isNew && selectedConfig && !selectedConfig.editable ? (
        <Callout>
          Cấu hình này thuộc cấp {SCOPE_LABELS[selectedConfig.scopeLevel].toLowerCase()}, bạn chỉ được xem và dùng. Muốn chỉnh sửa, hãy lưu thành một cấu hình mới của bạn.
        </Callout>
      ) : null}

      {ready ? (
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-[240px] max-w-md flex-1">
              <div className="mb-1 flex items-center gap-1.5">
                <label className="text-[13px] font-medium text-text-secondary" htmlFor="badge-config-name">
                  Tên cấu hình
                </label>
                <HelpTip label="Hướng dẫn tên cấu hình">Trùng tên sẽ tự thêm hậu tố (1), (2)…</HelpTip>
                {dirty ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--badge-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--badge-warning-fg)]">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
                    Chưa lưu
                  </span>
                ) : null}
              </div>
              <Input
                disabled={!canEditCurrent}
                id="badge-config-name"
                maxLength={MAX_NAME_LENGTH + 20}
                onChange={(event) => updateForm({ name: event.target.value }, "name")}
                placeholder="Ví dụ: Thẻ tham dự khóa Dự trưởng"
                value={form.name}
              />
              {nameTooLong ? (
                <p className="mt-1 text-xs text-danger" role="alert">
                  Tên tối đa {MAX_NAME_LENGTH} ký tự.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button aria-label="Hoàn tác" disabled={!canEditCurrent || !history.canUndo} onClick={undo} size="icon" title="Hoàn tác (Ctrl+Z)" type="button" variant="icon">
                <ArrowCounterClockwise size={18} />
              </Button>
              <Button aria-label="Làm lại" disabled={!canEditCurrent || !history.canRedo} onClick={redo} size="icon" title="Làm lại (Ctrl+Y)" type="button" variant="icon">
                <ArrowClockwise size={18} />
              </Button>
              <Button disabled={!canEditCurrent || !dirty} onClick={restoreSaved} type="button" variant="outline">
                <ClockCounterClockwise size={18} /> {isNew ? "Làm mới" : "Khôi phục bản đã lưu"}
              </Button>
            </div>
          </div>

          <BadgeCardSettings disabled={!canEditCurrent} errors={errors} form={form} onChange={updateForm} />
          <BadgeEditor canEdit={canEditCurrent} fields={fieldsQuery.data ?? []} form={form} onChange={(updater, key) => history.set(updater, key)} />
        </Panel>
      ) : null}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white/95 p-3 shadow-[var(--shadow-elevated)] backdrop-blur-md">
        <Button disabled={!canEditCurrent || busy || nameTooLong || invalid || (!isNew && !dirty)} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
          {isNew ? "Tạo cấu hình" : "Lưu cấu hình"}
        </Button>
        {!isNew && canCreate ? (
          <Button disabled={busy || nameTooLong || invalid} loading={saveAsNewMutation.isPending} onClick={() => saveAsNewMutation.mutate()} type="button" variant="outline">
            <Copy size={16} /> Lưu thành cấu hình mới
          </Button>
        ) : null}
        {!isNew && selectedConfig && canUpdate && selectedConfig.editable && !selectedConfig.isDefault ? (
          <Button disabled={busy} loading={setDefaultMutation.isPending} onClick={setAsDefault} type="button" variant="outline">
            <Star size={16} /> Đặt làm cấu hình chung
          </Button>
        ) : null}
        {!isNew && selectedConfig && canDelete && selectedConfig.editable ? (
          <Button
            className="ml-auto text-danger"
            disabled={busy || selectedConfig.isDefault}
            loading={deleteMutation.isPending}
            onClick={deleteConfig}
            title={selectedConfig.isDefault ? "Không thể xóa cấu hình chung. Hãy chọn cấu hình khác làm cấu hình chung trước." : undefined}
            type="button"
            variant="outline"
          >
            <Trash size={16} /> Xóa cấu hình
          </Button>
        ) : null}
        {invalid && canEditCurrent ? <span className="text-sm text-danger">Sửa các lỗi ở phần khổ thẻ trước khi lưu.</span> : null}
        {!canUpdate && !canCreate ? <span className="text-sm text-muted">Bạn chỉ có quyền xem thư viện cấu hình.</span> : null}
      </div>
    </div>
  );
}
