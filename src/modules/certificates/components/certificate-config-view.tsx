"use client";

import { BackgroundAlbumDialog } from "@/components/common/background-album-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ClockCounterClockwise,
  Copy,
  CursorClick,
  Eye,
  Info,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  QrCode,
  SlidersHorizontal,
  Star,
  TextB,
  TextItalic,
  TextT,
  TextUnderline,
  Trash,
  Images,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PhotoInspector } from "./photo-inspector";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Tip } from "@/components/ui/tip";
import { apiFetch, apiMutation, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/config/routes/routes";
import { cn } from "@/lib/utils";
import { useUndoHistory } from "../undo-history";
import {
  CertificateCanvas,
  FONT_OPTIONS,
  PAPER_OPTIONS,
  SCOPE_LABELS,
  blankForm,
  clamp,
  DEFAULT_PHOTO_SIZE,
  DEFAULT_QR_SIZE,
  MAX_QR_SIZE,
  MIN_QR_SIZE,
  formFromConfig,
  isSameForm,
  paperAspect,
  sampleValue,
  useCertificateFonts,
  type ConfigResponse,
  type CourseTypeRef,
  type DesignForm,
  type FieldCatalogItem,
  type FontFamily,
  type LayoutItem,
} from "./certificate-design";
import { ConfigPreviewTip } from "./certificate-config-preview";
import { useSessionState } from "@/lib/use-session-state";

// Giá trị selectedId khi đang soạn một cấu hình chưa lưu.
const NEW_CONFIG = "__new__";

const MAX_NAME_LENGTH = 200;

export function CertificateConfigView({ route }: { route?: RouteConfig }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const canCreate = hasPermissionPrefix(user, "training.certificate_config.create.");
  const canUpdate = hasPermissionPrefix(user, "training.certificate_config.update.");
  const canDelete = hasPermissionPrefix(user, "training.certificate_config.delete.");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addFieldKey, setAddFieldKey] = useState<string>("");
  const [preview, setPreview] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const history = useUndoHistory<DesignForm>(blankForm());
  const form = history.value;

  useCertificateFonts();

  // Toàn bộ cấu hình ở dạng gọn (không phân trang): xác định cấu hình chung và cấu hình đang mở.
  const optionsQuery = useQuery({
    queryKey: ["certificate-config", "options"],
    enabled: Boolean(user),
    queryFn: () => apiFetch<ConfigResponse[]>("/certificates/config/options"),
  });
  const fieldsQuery = useQuery({
    queryKey: ["certificate-config", "fields"],
    enabled: Boolean(user),
    queryFn: () => apiFetch<FieldCatalogItem[]>("/certificates/config/fields"),
  });
  const courseTypesQuery = useQuery({
    queryKey: ["certificate-config", "course-types"],
    enabled: Boolean(user),
    queryFn: () => apiFetch<CourseTypeRef[]>("/certificates/config/course-types"),
  });

  // Danh sách thư viện: tìm kiếm, lọc, sắp xếp, phân trang đều do BE xử lý.
  const [searchInput, setSearchInput] = useSessionState("cert-library:searchInput", "");
  const [search, setSearch] = useSessionState("cert-library:search", "");
  const [filters, setFilters] = useSessionState<LibraryFilters>("cert-library:filters", EMPTY_FILTERS);
  const [sort, setSort] = useSessionState<string>("cert-library:sort", "default");
  const [page, setPage] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput, setSearch]);

  const libraryParams = useMemo(() => buildLibraryParams({ search, filters, sort, page }), [search, filters, sort, page]);
  const libraryQuery = useQuery({
    queryKey: ["certificate-config", "list", libraryParams],
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    queryFn: () => apiFetch<PageResponse<ConfigResponse>>(`/certificates/config?${libraryParams}`),
  });
  const libraryItems = libraryQuery.data?.content ?? [];
  const totalPages = libraryQuery.data?.totalPages ?? 0;
  const filtering = Boolean(search) || Object.values(filters).some(Boolean) || sort !== "default";
  // Số điều kiện đang lọc hiện trên nút Bộ lọc (không tính ô tìm kiếm).
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (sort !== "default" ? 1 : 0);

  const configs = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data]);
  const defaultConfig = configs.find((config) => config.isDefault && config.editable) ?? configs.find((config) => config.isDefault) ?? null;

  // Cấu hình đang mở: người dùng chọn; chưa chọn / cấu hình đã bị xóa thì rơi về cấu hình chung.
  const resolvedId = !optionsQuery.data
    ? null
    : selectedId === NEW_CONFIG
      ? NEW_CONFIG
      : selectedId && configs.some((config) => config.id === selectedId)
        ? selectedId
        : (defaultConfig?.id ?? configs[0]?.id ?? NEW_CONFIG);
  const isNew = resolvedId === NEW_CONFIG;

  // Chi tiết (ảnh nền + bố cục) của cấu hình đang mở; danh sách chỉ trả dạng gọn.
  const detailQuery = useQuery({
    queryKey: ["certificate-config", "detail", resolvedId],
    enabled: Boolean(user) && Boolean(resolvedId) && !isNew,
    queryFn: () => apiFetch<ConfigResponse>(`/certificates/config/${resolvedId}`),
  });
  const selectedConfig = !isNew && detailQuery.data?.id === resolvedId ? detailQuery.data : null;

  // Bản đã lưu của cấu hình đang mở: đích của nút Khôi phục và mốc để biết có thay đổi chưa lưu.
  const baseline = useMemo(() => (selectedConfig ? formFromConfig(selectedConfig) : blankForm()), [selectedConfig]);
  const dirty = !isSameForm(form, baseline);

  // Nạp form khi đổi cấu hình đang mở (xóa lịch sử hoàn tác), sau khi chi tiết đã tải xong.
  // Dùng mẫu "điều chỉnh state khi khóa đổi" trong lúc render.
  if (resolvedId && loadedKey !== resolvedId && (isNew || selectedConfig)) {
    setLoadedKey(resolvedId);
    setSelectedIndex(null);
    history.load(baseline);
  }
  const ready = Boolean(resolvedId) && loadedKey === resolvedId;

  const canEditCurrent = isNew ? canCreate : canUpdate && Boolean(selectedConfig?.editable);
  const fieldLabel = (key?: string) => fieldsQuery.data?.find((item) => item.key === key)?.label ?? key ?? "";

  function updateFilters(patch: Partial<LibraryFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  }

  function updateForm(patch: Partial<DesignForm>, key?: string) {
    history.set((current) => ({ ...current, ...patch }), key);
  }

  function updateItem(index: number, patch: Partial<LayoutItem>, key?: string) {
    history.set(
      (current) => ({
        ...current,
        layout: current.layout.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
      }),
      key ? `${key}:${index}` : undefined,
    );
  }

  function addField() {
    if (!addFieldKey) return;
    history.set((current) => ({
      ...current,
      layout: [...current.layout, { type: "FIELD", fieldKey: addFieldKey, x: 0.5, y: 0.5, fontSize: 0.04, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false }],
    }));
    setSelectedIndex(form.layout.length);
    setAddFieldKey("");
  }

  function addText() {
    history.set((current) => ({
      ...current,
      layout: [...current.layout, { type: "TEXT", text: "Văn bản", x: 0.5, y: 0.5, fontSize: 0.04, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false }],
    }));
    setSelectedIndex(form.layout.length);
  }

  // Chỉ khi bố cục có phần tử QR thì khi xuất PDF mới sinh mã QR cho chứng nhận.
  function addQr() {
    history.set((current) => ({
      ...current,
      layout: [...current.layout, { type: "QR", size: DEFAULT_QR_SIZE, x: 0.88, y: 0.82, fontSize: 0.04, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false }],
    }));
    setSelectedIndex(form.layout.length);
  }

  // Ảnh đại diện của huynh trưởng nhận chứng nhận, lấy từ hồ sơ huynh trưởng lúc xuất PDF / xem trước.
  function addPhoto() {
    history.set((current) => ({
      ...current,
      layout: [...current.layout, { type: "PHOTO", photoRatio: "4x6", size: DEFAULT_PHOTO_SIZE, x: 0.12, y: 0.3, fontSize: 0.04, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false }],
    }));
    setSelectedIndex(form.layout.length);
  }

  function removeItem(index: number) {
    history.set((current) => ({ ...current, layout: current.layout.filter((_, idx) => idx !== index) }));
    setSelectedIndex(null);
  }

  const [albumOpen, setAlbumOpen] = useState(false);

  // Ctrl+Z hoàn tác, Ctrl+Y / Ctrl+Shift+Z làm lại. Không chặn hoàn tác gốc của ô nhập văn bản.
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
        const nonText = ["checkbox", "radio", "color", "range", "button", "file"];
        const isTextField =
          target.isContentEditable ||
          target.tagName === "TEXTAREA" ||
          (target.tagName === "INPUT" && !nonText.includes((target as HTMLInputElement).type));
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
    setSelectedIndex(null);
  }

  function payload() {
    return {
      name: form.name.trim(),
      paperSize: form.paperSize,
      orientation: form.orientation,
      // Backend chỉ nhận id ảnh đã tải lên; chưa có ảnh nào (kể cả ảnh cũ) thì yêu cầu xóa nền.
      backgroundAssetId: form.backgroundAssetId || null,
      clearBackground: !form.backgroundImage,
      fieldLayout: form.layout,
    };
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["certificate-config"] });
  }

  function notifyRenamed(requested: string, saved: ConfigResponse) {
    if (requested && saved.name !== requested) {
      toast.message(`Tên "${requested}" đã tồn tại nên được lưu là "${saved.name}".`);
    }
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? apiMutation<ConfigResponse>("/certificates/config", "POST", payload())
        : apiMutation<ConfigResponse>(`/certificates/config/${resolvedId}`, "PUT", payload()),
    onSuccess: async (saved) => {
      toast.success("Lưu cấu hình chứng nhận thành công");
      notifyRenamed(form.name.trim(), saved);
      await refresh();
      // Đã lưu: bản đang soạn trở thành bản đã lưu nên xóa lịch sử hoàn tác / làm lại.
      history.load(formFromConfig(saved));
      setSelectedIndex(null);
      if (isNew) setSelectedId(saved.id);
    },
  });

  // Lưu nội dung đang soạn thành một cấu hình mới (dùng khi cấu hình đang mở thuộc cấp khác hoặc muốn nhân bản).
  const saveAsNewMutation = useMutation({
    mutationFn: () => {
      const body = payload();
      return apiMutation<ConfigResponse>("/certificates/config", "POST", { ...body, name: body.name || "Cấu hình chứng nhận" });
    },
    onSuccess: async (saved) => {
      toast.success(`Đã tạo cấu hình mới "${saved.name}"`);
      await refresh();
      history.load(formFromConfig(saved));
      setSelectedIndex(null);
      setSelectedId(saved.id);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => apiMutation<ConfigResponse>(`/certificates/config/${resolvedId}/default`, "PUT"),
    onSuccess: async () => {
      toast.success("Đã đặt làm cấu hình chung");
      await refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiMutation<void>(`/certificates/config/${resolvedId}`, "DELETE"),
    onSuccess: async () => {
      toast.success("Đã xóa cấu hình chứng nhận");
      await refresh();
      setSelectedId(null);
      setLoadedKey(null);
    },
  });

  function setAsDefault() {
    if (!selectedConfig) return;
    const note = dirty ? " (Chỉ áp dụng bản đã lưu, thay đổi chưa lưu không được tính.)" : "";
    if (!window.confirm(`Đặt "${selectedConfig.name}" làm cấu hình chung? Các loại khóa chưa được gán cấu hình riêng sẽ dùng cấu hình này.${note}`)) return;
    setDefaultMutation.mutate();
  }

  function deleteConfig() {
    if (!selectedConfig) return;
    const used = selectedConfig.usedByCourseTypes;
    const impact = used.length
      ? `Cấu hình đang được ${used.length} loại khóa sử dụng (${used.map((type) => type.typeName || type.typeCode).join(", ")}). ` +
        "Sau khi xóa, các loại khóa này sẽ dùng cấu hình chung khi xuất chứng nhận."
      : "Hiện chưa có loại khóa nào dùng cấu hình này.";
    const message =
      `Xóa cấu hình "${selectedConfig.name}"?\n\n${impact}\n` +
      "Chứng nhận đã cấp không bị thay đổi; chỉ những lần xuất PDF sau này dùng cấu hình thay thế.";
    if (!window.confirm(message)) return;
    deleteMutation.mutate();
  }

  const selected = selectedIndex != null ? (form.layout[selectedIndex] ?? null) : null;
  const nameTooLong = form.name.length > MAX_NAME_LENGTH;
  const busy = saveMutation.isPending || saveAsNewMutation.isPending || setDefaultMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold leading-7 text-foreground">{route?.title ?? "Cấu hình chứng nhận"}</h1>
        {route?.subtitle ? <HelpTip label="Mô tả màn hình">{route.subtitle}</HelpTip> : null}
      </div>

      {/* Thư viện cấu hình */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="text-base font-semibold leading-6 text-foreground">Thư viện cấu hình</h2>
            <HelpTip label="Hướng dẫn thư viện cấu hình">
              Cấu hình chung dùng cho mọi loại khóa chưa được gán cấu hình riêng. Một cấu hình có thể gán cho nhiều loại khóa; mỗi loại khóa chỉ dùng một cấu hình.
            </HelpTip>
          </div>
          {canCreate ? (
            <Button onClick={startNew} type="button" variant={isNew ? "primary" : "outline"}>
              <Plus size={18} /> Tạo cấu hình mới
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-[480px]" role="search">
            <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Tìm theo tên cấu hình hoặc loại khóa"
              className="pl-9 pr-9"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên cấu hình hoặc loại khóa…"
              type="search"
              value={searchInput}
            />
            {searchInput ? (
              <button
                aria-label="Xóa nội dung tìm kiếm"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                onClick={() => setSearchInput("")}
                type="button"
              >
                <X size={14} weight="bold" />
              </button>
            ) : null}
          </div>
          <Dialog.Root>
            <Tip label="Lọc danh sách theo điều kiện">
              <Dialog.Trigger asChild>
                <Button className="shrink-0 justify-center" type="button" variant="outline">
                  <SlidersHorizontal size={18} />
                  Bộ lọc
                  {activeFilterCount ? (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">{activeFilterCount}</span>
                  ) : null}
                </Button>
              </Dialog.Trigger>
            </Tip>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
              <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
                  <div className="min-w-0">
                    <Dialog.Title className="text-lg font-semibold leading-[26px] text-foreground">Bộ lọc</Dialog.Title>
                    <Dialog.Description className="mt-0.5 text-[13px] text-muted">Thu hẹp thư viện cấu hình theo điều kiện.</Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                      <X size={20} />
                    </Button>
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
                  <FilterSelect
                    label="Phạm vi"
                    onChange={(value) => updateFilters({ scope: value })}
                    options={[["SYSTEM", "Hệ thống"], ["DIOCESE", "Giáo phận"], ["DEANERY", "Giáo hạt"]]}
                    value={filters.scope}
                  />
                  <FilterSelect
                    label="Cấu hình chung"
                    onChange={(value) => updateFilters({ isDefault: value })}
                    options={[["true", "Chỉ cấu hình chung"], ["false", "Không phải cấu hình chung"]]}
                    value={filters.isDefault}
                  />
                  <FilterSelect
                    label="Sử dụng"
                    onChange={(value) => updateFilters({ used: value })}
                    options={[["true", "Đang được dùng"], ["false", "Chưa có loại khóa dùng"]]}
                    value={filters.used}
                  />
                  <FilterSelect
                    label="Loại khóa"
                    onChange={(value) => updateFilters({ courseTypeCode: value })}
                    options={(courseTypesQuery.data ?? []).map((type) => [type.typeCode, type.typeName || type.typeCode] as [string, string])}
                    value={filters.courseTypeCode}
                  />
                  <FilterSelect
                    label="Khổ giấy"
                    onChange={(value) => updateFilters({ paperSize: value })}
                    options={PAPER_OPTIONS.map((option) => [option.value, option.label] as [string, string])}
                    value={filters.paperSize}
                  />
                  <FilterSelect
                    label="Hướng in"
                    onChange={(value) => updateFilters({ orientation: value })}
                    options={[["LANDSCAPE", "Ngang"], ["PORTRAIT", "Dọc"]]}
                    value={filters.orientation}
                  />
                  <FilterSelect
                    allLabel="Mặc định"
                    label="Sắp xếp"
                    onChange={(value) => {
                      setSort(value || "default");
                      setPage(0);
                    }}
                    options={SORT_OPTIONS.filter(([value]) => value !== "default")}
                    value={sort === "default" ? "" : sort}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border bg-white px-5 py-3">
                  <Button
                    disabled={activeFilterCount === 0}
                    onClick={() => {
                      setFilters(EMPTY_FILTERS);
                      setSort("default");
                      setPage(0);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Xóa lọc
                  </Button>
                  <Dialog.Close asChild>
                    <Button type="button">Áp dụng</Button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        <div className="p-4">
          {libraryQuery.isError ? (
            <p className="mb-3 text-sm text-danger" role="alert">
              {getApiErrorMessage(libraryQuery.error)}
            </p>
          ) : null}
          {libraryQuery.isLoading ? <p className="text-sm text-muted">Đang tải thư viện…</p> : null}
          {libraryQuery.data && libraryItems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
              {filtering ? "Không có cấu hình nào khớp bộ lọc. Thử bỏ bớt điều kiện lọc." : "Thư viện còn trống. Cấu hình đầu tiên bạn tạo sẽ tự động là cấu hình chung."}
            </p>
          ) : null}

          <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3", libraryQuery.isPlaceholderData && "opacity-60")}>
            {libraryItems.map((config) => {
              const active = config.id === resolvedId;
              return (
                <div
                  key={config.id}
                  className={cn(
                    "rounded-xl border p-3 transition-[border-color,box-shadow,background-color]",
                    active ? "border-primary bg-primary-soft/60 shadow-[0_0_0_1px_var(--primary)]" : "border-border bg-white hover:border-slate-300 hover:shadow-sm",
                  )}
                >
                  <ConfigPreviewTip config={config} fieldLabel={fieldLabel}>
                    <button aria-pressed={active} className="block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => selectConfig(config.id)} type="button">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 text-sm font-semibold leading-5 text-foreground">{config.name}</span>
                        {active ? <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">Đang mở</span> : null}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        {config.isDefault ? <Badge tone="primary">Cấu hình chung</Badge> : null}
                        <Badge>
                          {SCOPE_LABELS[config.scopeLevel]}
                          {!config.editable ? " · chỉ xem" : ""}
                        </Badge>
                      </span>
                      <span className="mt-2 block text-xs text-text-secondary">
                        {config.usedByCount > 0 ? `Đang dùng cho ${config.usedByCount} loại khóa` : "Chưa có loại khóa nào dùng"}
                        {" · "}
                        {config.paperSize} {config.orientation === "PORTRAIT" ? "dọc" : "ngang"}
                      </span>
                    </button>
                  </ConfigPreviewTip>
                  {config.usedByCount > 0 ? (
                    <details className="mt-2 text-xs text-text-secondary">
                      <summary className="cursor-pointer select-none font-medium text-primary">Xem các loại khóa</summary>
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                        {config.usedByCourseTypes.map((type) => (
                          <li key={type.typeCode}>{type.typeName || type.typeCode}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {libraryQuery.data && libraryQuery.data.totalElements > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-[13px] text-muted">
            <span>
              {libraryQuery.data.totalElements} cấu hình · Trang {page + 1}/{Math.max(totalPages, 1)}
            </span>
            <div className="flex gap-2">
              <Button disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))} size="sm" type="button" variant="outline">
                Trước
              </Button>
              <Button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} size="sm" type="button" variant="outline">
                Sau
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      {!isNew && selectedConfig && !selectedConfig.editable ? (
        <Callout>
          Cấu hình này thuộc cấp {SCOPE_LABELS[selectedConfig.scopeLevel].toLowerCase()}, bạn chỉ được xem và dùng. Muốn chỉnh sửa, hãy lưu thành một cấu hình mới của bạn.
        </Callout>
      ) : null}

      {/* Trình thiết kế */}
      {ready ? (
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-[240px] max-w-md flex-1">
              <div className="mb-1 flex items-center gap-1.5">
                <label className="text-[13px] font-medium text-text-secondary" htmlFor="certificate-config-name">
                  Tên cấu hình
                </label>
                <HelpTip label="Hướng dẫn tên cấu hình">
                  Trùng tên sẽ tự thêm hậu tố (1), (2)… Người ký được chọn khi <span className="font-semibold">duyệt từng chứng nhận</span> và ghi trực tiếp vào chứng nhận đó; khi xuất PDF sẽ dùng người ký của chính chứng nhận.
                </HelpTip>
                {dirty ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--badge-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--badge-warning-fg)]">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
                    Chưa lưu
                  </span>
                ) : null}
              </div>
              <Input
                disabled={!canEditCurrent}
                id="certificate-config-name"
                maxLength={MAX_NAME_LENGTH + 20}
                onChange={(event) => updateForm({ name: event.target.value }, "name")}
                placeholder="Ví dụ: Mẫu huynh trưởng cấp I"
                value={form.name}
              />
              {nameTooLong ? (
                <p className="mt-1 text-xs text-danger" role="alert">
                  Tên tối đa {MAX_NAME_LENGTH} ký tự.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div aria-label="Chế độ hiển thị" className="inline-flex rounded-lg bg-surface-2 p-1" role="group">
                <button
                  aria-pressed={!preview}
                  className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors", !preview ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground")}
                  onClick={() => setPreview(false)}
                  type="button"
                >
                  <PencilSimple size={15} /> Thiết kế
                </button>
                <button
                  aria-pressed={preview}
                  className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors", preview ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground")}
                  onClick={() => setPreview(true)}
                  type="button"
                >
                  <Eye size={15} /> Xem trước
                </button>
              </div>
              <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
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

          <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-border bg-slate-50 px-4 py-2.5">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Khổ giấy">
                <select
                  className={SELECT_CLASS}
                  disabled={!canEditCurrent}
                  value={form.paperSize}
                  onChange={(event) => updateForm({ paperSize: event.target.value })}
                >
                  {PAPER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Hướng in">
                <select
                  className={SELECT_CLASS}
                  disabled={!canEditCurrent}
                  value={form.orientation}
                  onChange={(event) => updateForm({ orientation: event.target.value })}
                >
                  <option value="LANDSCAPE">Ngang</option>
                  <option value="PORTRAIT">Dọc</option>
                </select>
              </Field>
              <Button disabled={!canEditCurrent} onClick={() => setAlbumOpen(true)} type="button" variant="outline">
                <Images size={16} />
                {form.backgroundImage ? "Đổi ảnh nền (album)" : "Chọn ảnh nền (album)"}
              </Button>
              <BackgroundAlbumDialog
                currentAssetId={form.backgroundAssetId || null}
                kind="CERTIFICATE"
                onOpenChange={setAlbumOpen}
                onPick={(item) => updateForm({ backgroundImage: item.url, backgroundAssetId: item.assetId })}
                open={albumOpen}
              />
            </div>

            {canEditCurrent ? (
              <>
                <span aria-hidden className="hidden h-8 w-px bg-border lg:block" />
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Thêm phần tử">
                    <select className={cn(SELECT_CLASS, "min-w-[200px]")} value={addFieldKey} onChange={(event) => setAddFieldKey(event.target.value)}>
                      <option value="">— Chọn trường dữ liệu —</option>
                      {(fieldsQuery.data ?? []).map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.group} · {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Button disabled={!addFieldKey} onClick={addField} type="button" variant="outline">
                    <Plus size={16} /> Thêm trường
                  </Button>
                  <Button onClick={addText} type="button" variant="outline">
                    <TextT size={16} /> Văn bản
                  </Button>
                  <Tip label="Thêm ảnh đại diện của huynh trưởng nhận chứng nhận. Ảnh lấy từ hồ sơ huynh trưởng khi xuất PDF; huynh trưởng chưa có ảnh thì không in gì.">
                    <Button onClick={addPhoto} type="button" variant="outline">
                      <UserCircle size={16} /> Ảnh huynh trưởng
                    </Button>
                  </Tip>
                  <Tip label="Thêm mã QR chứa mã chứng nhận. Chỉ khi bố cục có mã QR thì khi xuất PDF hệ thống mới tạo mã QR (không lưu lại).">
                    <Button onClick={addQr} type="button" variant="outline">
                      <QrCode size={16} /> Mã QR
                    </Button>
                  </Tip>
                </div>
                <span className="ml-auto hidden text-xs text-muted xl:block">Ctrl+Z hoàn tác · Ctrl+Y làm lại</span>
              </>
            ) : null}
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="bg-slate-100 p-3 sm:p-4">
              <CertificateCanvas
                backgroundImage={form.backgroundImage}
                layout={form.layout}
                fieldLabel={fieldLabel}
                sampleValue={(key) => sampleValue(key, fieldLabel)}
                preview={preview}
                aspect={paperAspect(form.paperSize, form.orientation)}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onMove={(index, x, y) => updateItem(index, { x, y }, "move")}
                onResizePhoto={(index, patch) => updateItem(index, patch, "photoResize")}
                editable={canEditCurrent && !preview}
              />
            </div>

            <aside aria-label="Thuộc tính phần tử" className="space-y-4 border-t border-border bg-white p-4 lg:border-l lg:border-t-0">
              {selected && selectedIndex != null ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Phần tử đang chọn</p>
                      <p className="truncate text-sm font-semibold text-foreground">
                        {selected.type === "TEXT" ? "Văn bản tĩnh" : selected.type === "QR" ? "Mã QR chứng nhận" : selected.type === "PHOTO" ? "Ảnh huynh trưởng" : fieldLabel(selected.fieldKey)}
                      </p>
                    </div>
                    <Button aria-label="Xóa phần tử" className="text-danger" disabled={!canEditCurrent} onClick={() => removeItem(selectedIndex)} size="icon" title="Xóa phần tử" type="button" variant="ghost">
                      <Trash size={18} />
                    </Button>
                  </div>

                  {selected.type === "QR" ? (
                    <div className="space-y-2">
                      <Field label="Kích thước mã QR (% chiều cao giấy)" hint="Mã QR chứa mã chứng nhận. Kéo để đặt vị trí (điểm kéo là tâm mã). Nên để đủ lớn và tương phản với nền để dễ quét.">
                        <Input
                          disabled={!canEditCurrent}
                          max={Math.round(MAX_QR_SIZE * 100)}
                          min={Math.round(MIN_QR_SIZE * 100)}
                          onChange={(event) => updateItem(selectedIndex, { size: clamp(Number(event.target.value) / 100, MIN_QR_SIZE, MAX_QR_SIZE) }, "qrSize")}
                          type="number"
                          value={Math.round((selected.size ?? DEFAULT_QR_SIZE) * 100)}
                        />
                      </Field>
                    </div>
                  ) : null}

                  {selected.type === "PHOTO" ? (
                    <PhotoInspector disabled={!canEditCurrent} item={selected} onChange={(patch, key) => updateItem(selectedIndex, patch, key)} unit="giấy" />
                  ) : null}

                  {selected.type === "TEXT" ? (
                    <Field label="Nội dung">
                      <Input disabled={!canEditCurrent} onChange={(event) => updateItem(selectedIndex, { text: event.target.value }, "text")} value={selected.text ?? ""} />
                    </Field>
                  ) : null}

                  {selected.type === "QR" || selected.type === "PHOTO" ? null : (
                    <>
                      <div className="space-y-3 border-t border-border pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Kiểu chữ</p>
                        <Field label="Phông chữ">
                          <select
                            className={cn(SELECT_CLASS, "w-full")}
                            disabled={!canEditCurrent}
                            onChange={(event) => updateItem(selectedIndex, { fontFamily: event.target.value as FontFamily })}
                            value={selected.fontFamily}
                          >
                            {FONT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Cỡ chữ (%)">
                            <Input
                              disabled={!canEditCurrent}
                              max={30}
                              min={1}
                              onChange={(event) => updateItem(selectedIndex, { fontSize: clamp(Number(event.target.value) / 100, 0.005, 0.3) }, "fontSize")}
                              type="number"
                              value={Math.round(selected.fontSize * 100)}
                            />
                          </Field>
                          <Field label="Màu chữ">
                            <input
                              aria-label="Màu chữ"
                              className="h-10 w-full cursor-pointer rounded-lg border border-input bg-white p-1 disabled:cursor-not-allowed"
                              disabled={!canEditCurrent}
                              onChange={(event) => updateItem(selectedIndex, { color: event.target.value }, "color")}
                              type="color"
                              value={selected.color}
                            />
                          </Field>
                        </div>
                        <Field label="Canh lề">
                          <div aria-label="Canh lề" className="inline-flex w-full rounded-lg bg-surface-2 p-1" role="group">
                            {(
                              [
                                ["left", "Trái"],
                                ["center", "Giữa"],
                                ["right", "Phải"],
                              ] as const
                            ).map(([value, label]) => (
                              <button
                                aria-pressed={selected.align === value}
                                className={cn(
                                  "h-8 flex-1 cursor-pointer rounded-md text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                  selected.align === value ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
                                )}
                                disabled={!canEditCurrent}
                                key={value}
                                onClick={() => updateItem(selectedIndex, { align: value as LayoutItem["align"] })}
                                type="button"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </Field>
                        <div className="flex gap-2">
                          <StyleToggle active={selected.bold} disabled={!canEditCurrent} label="In đậm" onClick={() => updateItem(selectedIndex, { bold: !selected.bold })}>
                            <TextB size={16} weight="bold" />
                          </StyleToggle>
                          <StyleToggle active={selected.italic} disabled={!canEditCurrent} label="In nghiêng" onClick={() => updateItem(selectedIndex, { italic: !selected.italic })}>
                            <TextItalic size={16} />
                          </StyleToggle>
                          <StyleToggle active={selected.underline} disabled={!canEditCurrent} label="Gạch chân" onClick={() => updateItem(selectedIndex, { underline: !selected.underline })}>
                            <TextUnderline size={16} />
                          </StyleToggle>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-center">
                  <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-white text-primary shadow-sm">
                    <CursorClick size={20} />
                  </span>
                  <p className="text-sm font-semibold text-foreground">Chưa chọn phần tử</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">Chọn một phần tử trên ảnh để chỉnh nội dung, cỡ chữ, màu và vị trí. Kéo phần tử để đổi vị trí.</p>
                </div>
              )}

              {selectedConfig ? (
                <div className="rounded-xl border border-border bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-foreground">Loại khóa đang dùng ({selectedConfig.usedByCount})</p>
                  {selectedConfig.usedByCount > 0 ? (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] text-text-secondary">
                      {selectedConfig.usedByCourseTypes.map((type) => (
                        <li key={type.typeCode}>{type.typeName || type.typeCode}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[13px] text-text-secondary">Chưa có loại khóa nào dùng cấu hình này. Gán trong form của từng loại khóa.</p>
                  )}
                </div>
              ) : null}
            </aside>
          </div>
        </Panel>
      ) : null}

      {/* Thanh thao tác cố định */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white/95 p-3 shadow-[var(--shadow-elevated)] backdrop-blur-md">
        <Button
          disabled={!canEditCurrent || busy || nameTooLong || (!isNew && !dirty)}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          type="button"
        >
          {isNew ? "Tạo cấu hình" : "Lưu cấu hình"}
        </Button>
        {!isNew && canCreate ? (
          <Button disabled={busy || nameTooLong} loading={saveAsNewMutation.isPending} onClick={() => saveAsNewMutation.mutate()} type="button" variant="outline">
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
        {!isNew && selectedConfig?.isDefault && canDelete && selectedConfig.editable ? (
          <HelpTip label="Vì sao không xóa được cấu hình chung">Cấu hình chung không xóa được. Chọn cấu hình khác làm cấu hình chung rồi mới xóa.</HelpTip>
        ) : null}
        {!canUpdate && !canCreate ? <span className="text-sm text-muted">Bạn chỉ có quyền xem thư viện cấu hình.</span> : null}
      </div>
    </div>
  );
}

const SELECT_CLASS =
  "h-10 cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[13px] font-medium text-text-secondary">
        {label}
        {hint ? <HelpTip label={`Hướng dẫn: ${label}`}>{hint}</HelpTip> : null}
      </span>
      {children}
    </label>
  );
}

function StyleToggle({ active, disabled, label, onClick, children }: { active: boolean; disabled: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid h-10 w-10 cursor-pointer place-items-center rounded-lg border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
        active ? "border-primary bg-primary-soft text-primary" : "border-input bg-white text-text-secondary hover:bg-slate-50",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 text-[13px] leading-5 text-text-secondary" role="note">
      <Info className="mt-0.5 shrink-0 text-primary" size={18} weight="fill" />
      <p>{children}</p>
    </div>
  );
}

const PAGE_SIZE = 6;

type LibraryFilters = {
  scope: string;
  isDefault: string;
  used: string;
  courseTypeCode: string;
  paperSize: string;
  orientation: string;
};

const EMPTY_FILTERS: LibraryFilters = { scope: "", isDefault: "", used: "", courseTypeCode: "", paperSize: "", orientation: "" };

const SORT_OPTIONS: [string, string][] = [
  ["default", "Mặc định"],
  ["name-asc", "Tên A → Z"],
  ["name-desc", "Tên Z → A"],
  ["used-desc", "Dùng nhiều nhất"],
  ["updated-desc", "Mới cập nhật"],
];

// Giá trị sắp xếp trên giao diện -> sortBy / sortDirection gửi lên BE.
const SORT_PARAMS: Record<string, { sortBy: string; sortDirection: string } | undefined> = {
  "name-asc": { sortBy: "name", sortDirection: "ASC" },
  "name-desc": { sortBy: "name", sortDirection: "DESC" },
  "used-desc": { sortBy: "usedByCount", sortDirection: "DESC" },
  "updated-desc": { sortBy: "updatedAt", sortDirection: "DESC" },
};

function buildLibraryParams({ search, filters, sort, page }: { search: string; filters: LibraryFilters; sort: string; page: number }) {
  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (search) params.set("search", search);
  const active = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  if (Object.keys(active).length > 0) params.set("filters", JSON.stringify(active));
  const sortParams = SORT_PARAMS[sort];
  if (sortParams) {
    params.set("sortBy", sortParams.sortBy);
    params.set("sortDirection", sortParams.sortDirection);
  }
  return params.toString();
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "Tất cả",
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  allLabel?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">{label}</span>
      <select
        className="h-10 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-foreground transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{allLabel}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "primary" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "primary" ? "bg-primary-soft text-primary" : "bg-surface-2 text-text-secondary",
      )}
    >
      {children}
    </span>
  );
}
