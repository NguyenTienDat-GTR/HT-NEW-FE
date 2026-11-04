"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowClockwise, ArrowCounterClockwise, Books, CaretDown, ClockCounterClockwise, Copy, Plus, Star, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { getApiErrorMessage } from "@/lib/api/client";
import { NEW_CONFIG, useConfigLibrary } from "@/modules/layout-config/use-config-library";
import { useUndoRedoShortcuts } from "@/modules/layout-config/use-undo-redo-shortcuts";
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
import { BadgeSheetSettings } from "./badge-card-settings";
import { FULLSCREEN_CLASS, FullscreenButton, useDesignerFullscreen } from "@/modules/layout-config/wysiwyg/use-fullscreen";
import { PreviewPdfButton } from "@/modules/layout-config/wysiwyg/preview-pdf-button";
import { VersionHistoryButton, type ConfigVersion } from "@/modules/layout-config/wysiwyg/version-history";
import { BADGE_SAMPLE_SETS } from "../badge-sample-values";
import { useSampleSet } from "@/modules/layout-config/wysiwyg/use-designer-support";
import { BadgeEditor } from "./badge-editor";
import { BadgeLibrary, EMPTY_LIBRARY_FILTERS, buildLibraryParams, type LibraryFilters } from "./badge-library";
import { Callout } from "@/modules/layout-config/form-controls";

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const screen = useDesignerFullscreen();
  const sample = useSampleSet("layout-sample:badge", BADGE_SAMPLE_SETS);
  const history = useUndoHistory<BadgeForm>(blankBadgeForm());
  const form = history.value;

  useCertificateFonts();


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
  const { api, fieldsQuery, libraryQuery, resolvedId, isNew, selectedConfig } = useConfigLibrary<BadgeConfig, FieldCatalogItem>({
    basePath: "/badges/config",
    queryRoot: QUERY_KEY,
    selectedId,
    libraryParams,
    fieldsStaleTime: 5 * 60_000,
  });



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

  // Ctrl+Z hoàn tác, Ctrl+Y / Ctrl+Shift+Z làm lại (ô số vẫn nhận phím tắt).
  const { undo, redo } = history;
  useUndoRedoShortcuts({ enabled: canEditCurrent, undo, redo, extraNonTextTypes: ["number"] });

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

  // Khôi phục một bản cũ: nạp nội dung (giữ tên hiện tại) vào trình soạn thành một bước hoàn tác, chưa lưu.
  function restoreVersion(version: ConfigVersion) {
    const snapshot = version.snapshot as unknown as BadgeConfig;
    const restored = formFromBadgeConfig({ ...snapshot, name: form.name });
    history.set((current) => ({
      ...restored,
      name: current.name,
      // Ảnh đã bị gỡ khỏi cấu hình sau các lần lưu thì không còn: bỏ cả mã ảnh để khỏi lưu mã hỏng.
      frontBackgroundAssetId: restored.frontBackground ? restored.frontBackgroundAssetId : "",
      backBackgroundAssetId: restored.backBackground ? restored.backBackgroundAssetId : "",
    }));
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }

  function notifyRenamed(requested: string, saved: BadgeConfig) {
    if (requested && saved.name !== requested) toast.message(`Tên "${requested}" đã tồn tại nên được lưu là "${saved.name}".`);
  }

  const saveMutation = useMutation({
    mutationFn: () => (isNew ? api.create(badgePayload(form)) : api.update(String(resolvedId), badgePayload(form))),
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
    mutationFn: () => api.create({ ...badgePayload(form), name: form.name.trim() || "Cấu hình thẻ tham dự" }),
    onSuccess: async (saved) => {
      toast.success(`Đã tạo cấu hình mới "${saved.name}"`);
      await refresh();
      history.load(formFromBadgeConfig(saved));
      setSelectedId(saved.id);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => api.setDefault(String(resolvedId)),
    onSuccess: async () => {
      toast.success("Đã đặt làm cấu hình chung");
      await refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.remove(String(resolvedId)),
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

  // Kích thước ảnh nền gốc của cấu hình đã lưu, theo mã ảnh (kiểm tra độ phân giải bằng ảnh in thật, không dùng ảnh xem trước).
  const savedSizes: Record<string, { width: number; height: number }> = {};
  if (selectedConfig?.frontBackgroundAssetId && selectedConfig.frontBackgroundWidthPx && selectedConfig.frontBackgroundHeightPx) {
    savedSizes[selectedConfig.frontBackgroundAssetId] = { width: selectedConfig.frontBackgroundWidthPx, height: selectedConfig.frontBackgroundHeightPx };
  }
  if (selectedConfig?.backBackgroundAssetId && selectedConfig.backBackgroundWidthPx && selectedConfig.backBackgroundHeightPx) {
    savedSizes[selectedConfig.backBackgroundAssetId] = { width: selectedConfig.backBackgroundWidthPx, height: selectedConfig.backBackgroundHeightPx };
  }

  const busy = saveMutation.isPending || saveAsNewMutation.isPending || setDefaultMutation.isPending || deleteMutation.isPending;
  const nameTooLong = form.name.length > MAX_NAME_LENGTH;
  const invalid = errors.length > 0;

  return (
    <div className="space-y-3">
      {/* Dòng đầu gọn: tiêu đề + cấu hình đang mở; thư viện chỉ mở ra khi cần đổi cấu hình để trình thiết kế nằm vừa một màn hình. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-bold leading-7 text-foreground">{route?.title ?? "Cấu hình thẻ tham dự"}</h1>
        {route?.subtitle ? <HelpTip label="Mô tả màn hình">{route.subtitle}</HelpTip> : null}
        {resolvedId ? (
          <div className="ml-auto flex items-center gap-2">
            <Button aria-expanded={libraryOpen} onClick={() => setLibraryOpen((open) => !open)} size="sm" type="button" variant="outline">
              <Books size={16} /> {libraryOpen ? "Ẩn thư viện" : "Đổi cấu hình"}
              <CaretDown className={libraryOpen ? "rotate-180" : ""} size={14} />
            </Button>
            {canCreate ? (
              <Button onClick={startNew} size="sm" type="button" variant={isNew ? "primary" : "outline"}>
                <Plus size={16} /> Tạo mới
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {libraryOpen || !resolvedId ? (
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
          onSelect={(id) => {
            selectConfig(id);
            setLibraryOpen(false);
          }}
          page={page}
          placeholder={libraryQuery.isPlaceholderData}
          searchInput={searchInput}
          totalElements={libraryQuery.data?.totalElements ?? 0}
          totalPages={libraryQuery.data?.totalPages ?? 0}
        />
      ) : null}

      {!isNew && selectedConfig && !selectedConfig.editable ? (
        <Callout>
          Cấu hình này thuộc cấp {SCOPE_LABELS[selectedConfig.scopeLevel].toLowerCase()}, bạn chỉ được xem và dùng. Muốn chỉnh sửa, hãy lưu thành một cấu hình mới của bạn.
        </Callout>
      ) : null}

      {ready ? (
        // Bàn làm việc: toàn bộ chức năng nằm trong một màn hình; chỉ cột trường và cột thuộc tính tự cuộn.
        <Panel className={cn("flex flex-col overflow-hidden", screen.fullscreen ? FULLSCREEN_CLASS : "lg:h-[calc(100dvh-10.5rem)] lg:min-h-[520px]")}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2">
            <div className="flex min-w-[220px] max-w-sm flex-1 items-center gap-1.5">
              <label className="sr-only" htmlFor="badge-config-name">
                Tên cấu hình
              </label>
              <Input
                aria-invalid={nameTooLong}
                className="h-9"
                disabled={!canEditCurrent}
                id="badge-config-name"
                maxLength={MAX_NAME_LENGTH + 20}
                onChange={(event) => updateForm({ name: event.target.value }, "name")}
                placeholder="Tên cấu hình, ví dụ: Thẻ tham dự khóa Dự trưởng"
                value={form.name}
              />
              <HelpTip label="Hướng dẫn tên cấu hình">Trùng tên sẽ tự thêm hậu tố (1), (2)…</HelpTip>
              {dirty ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--badge-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--badge-warning-fg)]">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
                  Chưa lưu
                </span>
              ) : null}
            </div>
            {nameTooLong ? (
              <p className="text-xs text-danger" role="alert">
                Tên tối đa {MAX_NAME_LENGTH} ký tự.
              </p>
            ) : null}
            <BadgeSheetSettings disabled={!canEditCurrent} errors={errors} form={form} onChange={updateForm} />

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <FullscreenButton fullscreen={screen.fullscreen} onToggle={screen.toggle} />
              <Button aria-label="Hoàn tác" className="h-9 w-9" disabled={!canEditCurrent || !history.canUndo} onClick={undo} size="icon" title="Hoàn tác (Ctrl+Z)" type="button" variant="icon">
                <ArrowCounterClockwise size={17} />
              </Button>
              <Button aria-label="Làm lại" className="h-9 w-9" disabled={!canEditCurrent || !history.canRedo} onClick={redo} size="icon" title="Làm lại (Ctrl+Y)" type="button" variant="icon">
                <ArrowClockwise size={17} />
              </Button>
              <Button disabled={!canEditCurrent || !dirty} onClick={restoreSaved} size="sm" title={isNew ? "Xóa toàn bộ nội dung đang soạn" : "Khôi phục về bản đã lưu"} type="button" variant="outline">
                <ClockCounterClockwise size={16} /> {isNew ? "Làm mới" : "Khôi phục"}
              </Button>
              <VersionHistoryButton onRestore={restoreVersion} path={isNew || !resolvedId ? null : `/badges/config/${resolvedId}/versions`} queryKey="badge" />
              <PreviewPdfButton
                buildBody={() => ({ config: badgePayload(form), values: sample.values })}
                disabled={invalid}
                fallbackName="xem-truoc-the-tham-du.pdf"
                path="/badges/config/preview-pdf"
              />
              <span aria-hidden className="hidden h-6 w-px bg-border xl:block" />
              <Button disabled={!canEditCurrent || busy || nameTooLong || invalid || (!isNew && !dirty)} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} size="sm" type="button">
                {isNew ? "Tạo cấu hình" : "Lưu cấu hình"}
              </Button>
              {!isNew && canCreate ? (
                <Button aria-label="Lưu thành cấu hình mới" disabled={busy || nameTooLong || invalid} loading={saveAsNewMutation.isPending} onClick={() => saveAsNewMutation.mutate()} size="sm" type="button" variant="outline">
                  <Copy size={16} /> Lưu thành mới
                </Button>
              ) : null}
              {!isNew && selectedConfig && canUpdate && selectedConfig.editable && !selectedConfig.isDefault ? (
                <Button aria-label="Đặt làm cấu hình chung" disabled={busy} loading={setDefaultMutation.isPending} onClick={setAsDefault} size="sm" type="button" variant="outline">
                  <Star size={16} /> Đặt làm chung
                </Button>
              ) : null}
              {!isNew && selectedConfig && canDelete && selectedConfig.editable ? (
                <Button
                  aria-label="Xóa cấu hình"
                  className="text-danger"
                  disabled={busy || selectedConfig.isDefault}
                  loading={deleteMutation.isPending}
                  onClick={deleteConfig}
                  size="sm"
                  title={selectedConfig.isDefault ? "Không thể xóa cấu hình chung. Hãy chọn cấu hình khác làm cấu hình chung trước." : undefined}
                  type="button"
                  variant="outline"
                >
                  <Trash size={16} /> Xóa
                </Button>
              ) : null}
              {!canUpdate && !canCreate ? <span className="text-sm text-muted">Bạn chỉ có quyền xem thư viện cấu hình.</span> : null}
            </div>
          </div>
          {invalid && canEditCurrent ? <p className="border-b border-border bg-danger/5 px-3 py-1.5 text-xs text-danger">Sửa các lỗi ở phần khổ thẻ trước khi lưu.</p> : null}

          <BadgeEditor savedSizes={savedSizes} sample={sample} canEdit={canEditCurrent} fields={fieldsQuery.data ?? []} form={form} onChange={(updater, key) => history.set(updater, key)} />
        </Panel>
      ) : null}
    </div>
  );
}
