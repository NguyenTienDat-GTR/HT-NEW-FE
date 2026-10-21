"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ClockCounterClockwise,
  Copy,
  Eye,
  MagnifyingGlass,
  Plus,
  QrCode,
  SlidersHorizontal,
  Star,
  TextT,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<string>("default");
  const [page, setPage] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

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

  function removeItem(index: number) {
    history.set((current) => ({ ...current, layout: current.layout.filter((_, idx) => idx !== index) }));
    setSelectedIndex(null);
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") updateForm({ backgroundImage: reader.result });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

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
      backgroundImage: form.backgroundImage || null,
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{route?.title ?? "Cấu hình chứng nhận"}</h1>
        <p className="mt-1 text-sm text-muted">{route?.subtitle}</p>
      </div>

      <Panel className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Thư viện cấu hình</h2>
            <p className="text-xs text-muted">
              Cấu hình chung dùng cho mọi loại khóa chưa được gán cấu hình riêng. Một cấu hình có thể gán cho nhiều loại khóa; mỗi loại khóa chỉ dùng một cấu hình.
            </p>
          </div>
          {canCreate ? (
            <Button onClick={startNew} size="sm" type="button" variant={isNew ? "primary" : "outline"}>
              <Plus size={16} /> Tạo cấu hình mới
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên cấu hình hoặc loại khóa…"
              value={searchInput}
            />
          </div>
          <Dialog.Root>
            <Tip label="Lọc danh sách theo điều kiện">
              <Dialog.Trigger asChild>
                <Button className="shrink-0 justify-center" type="button" variant="outline">
                  <SlidersHorizontal size={18} />
                  Bộ lọc
                  {activeFilterCount ? (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </Dialog.Trigger>
            </Tip>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
              <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[440px] flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
                <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-foreground">Bộ lọc</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-muted">Chọn điều kiện để thu hẹp thư viện cấu hình.</Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                      <X size={20} />
                    </Button>
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
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
                <div className="flex justify-end gap-3 border-t border-border bg-surface-1/60 p-4">
                  <Button
                    onClick={() => {
                      setFilters(EMPTY_FILTERS);
                      setSort("default");
                      setPage(0);
                    }}
                    type="button"
                    variant="outline"
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

        {libraryQuery.isError ? <p className="text-sm text-danger">{getApiErrorMessage(libraryQuery.error)}</p> : null}
        {libraryQuery.isLoading ? <p className="text-sm text-muted">Đang tải thư viện…</p> : null}
        {libraryQuery.data && libraryItems.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-border p-4 text-sm text-muted">
            {filtering ? "Không có cấu hình nào khớp bộ lọc." : "Thư viện còn trống. Cấu hình đầu tiên bạn tạo sẽ tự động là cấu hình chung."}
          </p>
        ) : null}

        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3", libraryQuery.isPlaceholderData && "opacity-60")}>
          {libraryItems.map((config) => {
            const active = config.id === resolvedId;
            return (
              <div
                key={config.id}
                className={cn("rounded-[10px] border p-3 transition-colors", active ? "border-primary bg-primary/5" : "border-border bg-white")}
              >
                <ConfigPreviewTip config={config} fieldLabel={fieldLabel}>
                  <button className="block w-full text-left" onClick={() => selectConfig(config.id)} type="button">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">{config.name}</span>
                      {config.isDefault ? <Badge tone="primary">Cấu hình chung</Badge> : null}
                      <Badge>{SCOPE_LABELS[config.scopeLevel]}{!config.editable ? " · chỉ xem" : ""}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {config.usedByCount > 0 ? `Đang dùng cho ${config.usedByCount} loại khóa` : "Chưa có loại khóa nào dùng"}
                      {" · "}
                      {config.paperSize} {config.orientation === "PORTRAIT" ? "dọc" : "ngang"}
                    </p>
                  </button>
                </ConfigPreviewTip>
                {config.usedByCount > 0 ? (
                  <details className="mt-1 text-xs text-muted">
                    <summary className="cursor-pointer select-none">Xem các loại khóa</summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
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

        {libraryQuery.data && libraryQuery.data.totalElements > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
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
        <p className="rounded-[10px] border border-dashed border-border bg-surface-2/50 px-4 py-3 text-sm text-muted">
          Cấu hình này thuộc cấp {SCOPE_LABELS[selectedConfig.scopeLevel].toLowerCase()}, bạn chỉ được xem và dùng. Muốn chỉnh sửa, hãy lưu thành một cấu hình mới của bạn.
        </p>
      ) : null}

      <p className="rounded-[10px] border border-dashed border-border bg-surface-2/50 px-4 py-3 text-sm text-muted">
        Người ký được chọn khi <span className="font-semibold text-foreground">duyệt từng chứng nhận</span> và ghi trực tiếp vào chứng nhận đó; khi xuất PDF sẽ dùng người ký của chính chứng nhận.
      </p>

      {ready ? (
        <Panel className="space-y-4 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-[240px] flex-1 max-w-md">
              <label className="mb-1 block text-xs font-medium text-muted">
                Tên cấu hình {dirty ? <span className="font-semibold text-warning">· chưa lưu</span> : null}
              </label>
              <Input
                disabled={!canEditCurrent}
                maxLength={MAX_NAME_LENGTH + 20}
                onChange={(event) => updateForm({ name: event.target.value }, "name")}
                placeholder="Ví dụ: Mẫu huynh trưởng cấp I"
                value={form.name}
              />
              {nameTooLong ? <p className="mt-1 text-xs text-danger">Tên tối đa {MAX_NAME_LENGTH} ký tự.</p> : null}
              <p className="mt-1 text-xs text-muted">Trùng tên sẽ tự thêm hậu tố (1), (2)…</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={!canEditCurrent || !history.canUndo} onClick={undo} size="sm" title="Hoàn tác (Ctrl+Z)" type="button" variant="outline">
                <ArrowCounterClockwise size={16} /> Hoàn tác
              </Button>
              <Button disabled={!canEditCurrent || !history.canRedo} onClick={redo} size="sm" title="Làm lại (Ctrl+Y)" type="button" variant="outline">
                <ArrowClockwise size={16} /> Làm lại
              </Button>
              <Button disabled={!canEditCurrent || !dirty} onClick={restoreSaved} size="sm" type="button" variant="outline">
                <ClockCounterClockwise size={16} /> {isNew ? "Làm mới" : "Khôi phục bản đã lưu"}
              </Button>
              <Button onClick={() => setPreview((value) => !value)} size="sm" type="button" variant={preview ? "primary" : "outline"}>
                <Eye size={16} /> {preview ? "Đang xem trước" : "Xem trước"}
              </Button>
              <label
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary",
                  !canEditCurrent && "pointer-events-none opacity-60",
                )}
              >
                <UploadSimple size={16} />
                {form.backgroundImage ? "Đổi ảnh nền" : "Tải ảnh nền"}
                <input accept="image/*" className="sr-only" disabled={!canEditCurrent} onChange={handleUpload} type="file" />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Khổ giấy</label>
              <select
                className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm"
                disabled={!canEditCurrent}
                value={form.paperSize}
                onChange={(event) => updateForm({ paperSize: event.target.value })}
              >
                {PAPER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Hướng in</label>
              <select
                className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm"
                disabled={!canEditCurrent}
                value={form.orientation}
                onChange={(event) => updateForm({ orientation: event.target.value })}
              >
                <option value="LANDSCAPE">Ngang</option>
                <option value="PORTRAIT">Dọc</option>
              </select>
            </div>
          </div>

          {canEditCurrent ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm"
                value={addFieldKey}
                onChange={(event) => setAddFieldKey(event.target.value)}
              >
                <option value="">— Chọn trường để thêm —</option>
                {(fieldsQuery.data ?? []).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.group} · {item.label}
                  </option>
                ))}
              </select>
              <Button disabled={!addFieldKey} onClick={addField} size="sm" type="button" variant="outline">
                <Plus size={16} /> Thêm trường
              </Button>
              <Button onClick={addText} size="sm" type="button" variant="outline">
                <TextT size={16} /> Thêm văn bản
              </Button>
              <Tip label="Thêm mã QR chứa mã chứng nhận. Chỉ khi bố cục có mã QR thì khi xuất PDF hệ thống mới tạo mã QR (không lưu lại).">
                <Button onClick={addQr} size="sm" type="button" variant="outline">
                  <QrCode size={16} /> Thêm mã QR
                </Button>
              </Tip>
              <span className="text-xs text-muted">Ctrl+Z hoàn tác · Ctrl+Y làm lại</span>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
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
              editable={canEditCurrent && !preview}
            />

            <div className="space-y-3">
              {selected && selectedIndex != null ? (
                <div className="space-y-3 rounded-[10px] border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {selected.type === "TEXT" ? "Văn bản tĩnh" : selected.type === "QR" ? "Mã QR chứng nhận" : fieldLabel(selected.fieldKey)}
                    </span>
                    <Button disabled={!canEditCurrent} onClick={() => removeItem(selectedIndex)} size="sm" type="button" variant="ghost">
                      <Trash size={16} />
                    </Button>
                  </div>
                  {selected.type === "QR" ? (
                    <div className="space-y-2">
                      <label className="mb-1 block text-xs font-medium text-muted">Kích thước mã QR (% chiều cao giấy)</label>
                      <Input
                        disabled={!canEditCurrent}
                        max={Math.round(MAX_QR_SIZE * 100)}
                        min={Math.round(MIN_QR_SIZE * 100)}
                        onChange={(event) => updateItem(selectedIndex, { size: clamp(Number(event.target.value) / 100, MIN_QR_SIZE, MAX_QR_SIZE) }, "qrSize")}
                        type="number"
                        value={Math.round((selected.size ?? DEFAULT_QR_SIZE) * 100)}
                      />
                      <p className="text-xs text-muted">Mã QR chứa mã chứng nhận. Kéo để đặt vị trí (điểm kéo là tâm mã). Nên để đủ lớn và tương phản với nền để dễ quét.</p>
                    </div>
                  ) : null}
                  {selected.type === "QR" ? null : selected.type === "TEXT" ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">Nội dung</label>
                      <Input disabled={!canEditCurrent} onChange={(event) => updateItem(selectedIndex, { text: event.target.value }, "text")} value={selected.text ?? ""} />
                    </div>
                  ) : null}
                  {selected.type === "QR" ? null : (
                  <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Phông chữ</label>
                    <select
                      className="h-10 w-full rounded-[8px] border border-border bg-white px-2 text-sm"
                      disabled={!canEditCurrent}
                      onChange={(event) => updateItem(selectedIndex, { fontFamily: event.target.value as FontFamily })}
                      value={selected.fontFamily}
                    >
                      {FONT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">Cỡ chữ (%)</label>
                      <Input
                        disabled={!canEditCurrent}
                        max={30}
                        min={1}
                        onChange={(event) => updateItem(selectedIndex, { fontSize: clamp(Number(event.target.value) / 100, 0.005, 0.3) }, "fontSize")}
                        type="number"
                        value={Math.round(selected.fontSize * 100)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">Màu chữ</label>
                      <input
                        className="h-10 w-full rounded-[8px] border border-border"
                        disabled={!canEditCurrent}
                        onChange={(event) => updateItem(selectedIndex, { color: event.target.value }, "color")}
                        type="color"
                        value={selected.color}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted">Canh lề</label>
                      <select
                        className="h-10 w-full rounded-[8px] border border-border bg-white px-2 text-sm"
                        disabled={!canEditCurrent}
                        onChange={(event) => updateItem(selectedIndex, { align: event.target.value as LayoutItem["align"] })}
                        value={selected.align}
                      >
                        <option value="left">Trái</option>
                        <option value="center">Giữa</option>
                        <option value="right">Phải</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input checked={selected.bold} disabled={!canEditCurrent} onChange={(event) => updateItem(selectedIndex, { bold: event.target.checked })} type="checkbox" />
                      In đậm
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input checked={selected.italic} disabled={!canEditCurrent} onChange={(event) => updateItem(selectedIndex, { italic: event.target.checked })} type="checkbox" />
                      In nghiêng
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input checked={selected.underline} disabled={!canEditCurrent} onChange={(event) => updateItem(selectedIndex, { underline: event.target.checked })} type="checkbox" />
                      Gạch chân
                    </label>
                  </div>
                  </>
                  )}
                </div>
              ) : (
                <p className="rounded-[10px] border border-dashed border-border p-4 text-sm text-muted">
                  Chọn một phần tử trên ảnh để chỉnh nội dung, cỡ chữ, màu và vị trí. Kéo phần tử để đổi vị trí.
                </p>
              )}

              {selectedConfig ? (
                <div className="rounded-[10px] border border-border p-3 text-sm">
                  <p className="font-semibold text-foreground">Loại khóa đang dùng ({selectedConfig.usedByCount})</p>
                  {selectedConfig.usedByCount > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">
                      {selectedConfig.usedByCourseTypes.map((type) => (
                        <li key={type.typeCode}>{type.typeName || type.typeCode}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-muted">Chưa có loại khóa nào dùng cấu hình này. Gán trong form của từng loại khóa.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
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
          <span className="text-xs text-muted">Cấu hình chung không xóa được. Chọn cấu hình khác làm cấu hình chung rồi mới xóa.</span>
        ) : null}
        {!canUpdate && !canCreate ? <span className="text-sm text-muted">Bạn chỉ có quyền xem thư viện cấu hình.</span> : null}
      </div>
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
      <span className="mb-2 block text-xs font-semibold text-foreground">{label}</span>
      <select
        className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]"
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
        tone === "primary" ? "bg-primary/10 text-primary" : "bg-surface-2 text-muted",
      )}
    >
      {children}
    </span>
  );
}
