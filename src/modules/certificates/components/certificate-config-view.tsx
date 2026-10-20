"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, Plus, TextT, Trash, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/config/routes/routes";
import { cn } from "@/lib/utils";

type SignerType = "CHAPLAIN" | "OTHER";

type FontFamily = "sans" | "serif";

type LayoutItem = {
  type: "FIELD" | "TEXT";
  fieldKey?: string;
  text?: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

type ConfigResponse = {
  id?: string;
  courseTypeCode: string | null;
  courseTypeName?: string | null;
  signerType?: SignerType;
  signerName?: string;
  signerTitle?: string;
  backgroundImage?: string;
  fieldLayout?: LayoutItem[];
};

type FieldCatalogItem = { key: string; label: string; group: string };

const DEFAULT_SCOPE = "__default__";

function blankForm(): { signerType: SignerType; signerName: string; signerTitle: string; backgroundImage: string; layout: LayoutItem[] } {
  return { signerType: "CHAPLAIN", signerName: "", signerTitle: "", backgroundImage: "", layout: [] };
}

export function CertificateConfigView({
  route,
  fixedScope,
  embedded = false,
}: {
  route?: RouteConfig;
  // Khi nhúng trong form loại khóa: khóa phạm vi vào đúng loại khóa đó và ẩn ô chọn phạm vi.
  fixedScope?: { courseTypeCode: string; courseTypeName?: string };
  embedded?: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const canManage = hasPermissionPrefix(user, "training.certificate_config.update.");

  const [scope, setScope] = useState<string>(fixedScope ? fixedScope.courseTypeCode : DEFAULT_SCOPE);
  const [form, setForm] = useState(blankForm());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addFieldKey, setAddFieldKey] = useState<string>("");
  const [preview, setPreview] = useState(false);

  const configsQuery = useQuery({
    queryKey: ["certificate-config", "list"],
    enabled: Boolean(user),
    queryFn: () => apiFetch<ConfigResponse[]>("/certificates/config"),
  });
  const fieldsQuery = useQuery({
    queryKey: ["certificate-config", "fields"],
    enabled: Boolean(user),
    queryFn: () => apiFetch<FieldCatalogItem[]>("/certificates/config/fields"),
  });
  const courseTypesQuery = useQuery({
    queryKey: ["certificate-config", "course-types"],
    enabled: Boolean(user) && !fixedScope,
    queryFn: () => apiFetch<{ typeCode: string; typeName: string }[]>("/certificates/config/course-types"),
  });

  const certifiedTypes = courseTypesQuery.data ?? [];

  const configForScope = useMemo(() => {
    const configs = configsQuery.data ?? [];
    if (scope === DEFAULT_SCOPE) return configs.find((config) => config.courseTypeCode == null) ?? null;
    return configs.find((config) => config.courseTypeCode === scope) ?? null;
  }, [configsQuery.data, scope]);

  // Nạp form theo phạm vi đang chọn (hoặc để trống nếu chưa có) ngay khi đổi phạm vi / dữ liệu tải xong.
  // Dùng mẫu "điều chỉnh state khi khóa đổi" trong lúc render thay cho useEffect để tránh render xếp tầng.
  const scopeKey = `${scope}|${configForScope?.id ?? "new"}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (loadedKey !== scopeKey) {
    setLoadedKey(scopeKey);
    setSelectedIndex(null);
    setForm(
      configForScope
        ? {
            signerType: configForScope.signerType ?? "CHAPLAIN",
            signerName: configForScope.signerName ?? "",
            signerTitle: configForScope.signerTitle ?? "",
            backgroundImage: configForScope.backgroundImage ?? "",
            layout: (configForScope.fieldLayout ?? []).map(normalizeItem),
          }
        : blankForm(),
    );
  }

  const defaultConfig = useMemo(() => (configsQuery.data ?? []).find((config) => config.courseTypeCode == null) ?? null, [configsQuery.data]);
  const isSpecificScope = scope !== DEFAULT_SCOPE;

  const fieldLabel = (key?: string) => fieldsQuery.data?.find((item) => item.key === key)?.label ?? key ?? "";

  function copyFromDefault() {
    if (!defaultConfig) return;
    if (!window.confirm("Thao tác này sẽ ghi đè nội dung đang chỉnh bằng cấu hình chung. Tiếp tục?")) return;
    setSelectedIndex(null);
    setForm({
      signerType: defaultConfig.signerType ?? "CHAPLAIN",
      signerName: defaultConfig.signerName ?? "",
      signerTitle: defaultConfig.signerTitle ?? "",
      backgroundImage: defaultConfig.backgroundImage ?? "",
      layout: (defaultConfig.fieldLayout ?? []).map(normalizeItem),
    });
    toast.message("Đã nạp từ cấu hình chung. Chỉnh sửa rồi bấm Lưu để lưu cho riêng loại khóa này.");
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiMutation("/certificates/config", "PUT", {
        courseTypeCode: scope === DEFAULT_SCOPE ? null : scope,
        signerType: form.signerType,
        signerName: form.signerName,
        signerTitle: form.signerType === "OTHER" ? form.signerTitle : null,
        backgroundImage: form.backgroundImage || null,
        fieldLayout: form.layout,
      }),
    onSuccess: async () => {
      toast.success("Lưu cấu hình chứng nhận thành công");
      await queryClient.invalidateQueries({ queryKey: ["certificate-config", "list"] });
    },
  });

  // Đặt nội dung đang chỉnh của loại khóa này làm cấu hình chung (mặc định).
  const setAsDefaultMutation = useMutation({
    mutationFn: () =>
      apiMutation("/certificates/config", "PUT", {
        courseTypeCode: null,
        signerType: form.signerType,
        signerName: form.signerName,
        signerTitle: form.signerType === "OTHER" ? form.signerTitle : null,
        backgroundImage: form.backgroundImage || null,
        fieldLayout: form.layout,
      }),
    onSuccess: async () => {
      toast.success("Đã đặt làm cấu hình chung");
      await queryClient.invalidateQueries({ queryKey: ["certificate-config", "list"] });
    },
  });

  function setAsDefault() {
    if (!window.confirm("Đặt nội dung hiện tại làm cấu hình chung (mặc định) cho mọi loại khóa chưa cấu hình riêng?")) return;
    setAsDefaultMutation.mutate();
  }

  // Giá trị mẫu để xem trước; trường người ký dùng giá trị đang nhập.
  function sampleValue(key?: string) {
    switch (key) {
      case "signerName":
        return form.signerName || "Nguyễn Văn A";
      case "signerTitle":
        return form.signerType === "OTHER" ? form.signerTitle || "Chức danh" : "Linh mục tuyên úy";
      case "leaderFullName":
        return "Giuse Nguyễn Văn An";
      case "leaderBirthDate":
        return "01/01/1990";
      case "leaderGender":
        return "Nam";
      case "leaderParishName":
        return "Giáo xứ Thượng Phúc";
      case "leaderDeaneryName":
        return "Giáo hạt Phú Cường";
      case "leaderDioceseName":
        return "Phú Cường";
      case "leaderLevel":
        return "Huynh trưởng cấp I";
      case "courseName":
        return "Sa mạc huấn luyện Huynh trưởng cấp I";
      case "courseCode":
        return "KH-2026-01";
      case "hostYear":
        return "2026";
      case "resultingLevel":
        return "Huynh trưởng cấp I";
      case "certificateCode":
        return "GPPC-HTI-2026-1";
      case "certificateName":
        return "Chứng nhận hoàn thành khóa huấn luyện";
      case "result":
        return "Đạt";
      case "issueDate":
        return "20/10/2026";
      default:
        return fieldLabel(key);
    }
  }

  function updateForm(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateItem(index: number, patch: Partial<LayoutItem>) {
    setForm((current) => ({
      ...current,
      layout: current.layout.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  }

  function addField() {
    if (!addFieldKey) return;
    setForm((current) => ({
      ...current,
      layout: [...current.layout, { type: "FIELD", fieldKey: addFieldKey, x: 0.5, y: 0.5, fontSize: 0.04, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false }],
    }));
    setSelectedIndex(form.layout.length);
    setAddFieldKey("");
  }

  function addText() {
    setForm((current) => ({
      ...current,
      layout: [...current.layout, { type: "TEXT", text: "Văn bản", x: 0.5, y: 0.5, fontSize: 0.04, color: "#000000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false }],
    }));
    setSelectedIndex(form.layout.length);
  }

  function removeItem(index: number) {
    setForm((current) => ({ ...current, layout: current.layout.filter((_, idx) => idx !== index) }));
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

  const canSave =
    canManage &&
    form.signerName.trim().length > 0 &&
    (form.signerType !== "OTHER" || form.signerTitle.trim().length > 0);

  const selected = selectedIndex != null ? form.layout[selectedIndex] : null;

  return (
    <div className="space-y-5">
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{route?.title ?? "Cấu hình chứng nhận"}</h1>
          <p className="mt-1 text-sm text-muted">{route?.subtitle}</p>
        </div>
      ) : null}

      {fixedScope ? (
        <p className="text-sm text-muted">
          Cấu hình chứng nhận riêng cho loại khóa <span className="font-semibold text-foreground">{fixedScope.courseTypeName ?? fixedScope.courseTypeCode}</span>.
          Nếu để trống, loại khóa này sẽ dùng cấu hình chung mặc định khi xuất chứng nhận.
        </p>
      ) : (
        <Panel className="space-y-4 p-5">
          <label className="block text-sm font-semibold text-foreground">Phạm vi cấu hình</label>
          <select
            className="h-11 w-full max-w-md rounded-[8px] border border-border bg-white px-3 text-sm"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
          >
            <option value={DEFAULT_SCOPE}>Cấu hình chung (mặc định)</option>
            {certifiedTypes.map((type) => (
              <option key={type.typeCode} value={type.typeCode}>
                {type.typeName ?? type.typeCode}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            Loại khóa chưa có cấu hình riêng sẽ dùng cấu hình chung mặc định khi xuất chứng nhận.
          </p>
        </Panel>
      )}

      {isSpecificScope && defaultConfig && canManage ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-dashed border-border bg-surface-2/50 px-4 py-3">
          <span className="text-sm text-muted">Bắt đầu nhanh bằng cách sao chép cấu hình chung rồi chỉnh lại cho loại khóa này.</span>
          <Button onClick={copyFromDefault} size="sm" type="button" variant="outline">
            Lấy từ cấu hình chung
          </Button>
        </div>
      ) : null}

      <Panel className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-foreground">Người ký chứng nhận</h2>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              checked={form.signerType === "CHAPLAIN"}
              disabled={!canManage}
              onChange={() => updateForm({ signerType: "CHAPLAIN" })}
              type="radio"
            />
            Linh mục tuyên úy
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              checked={form.signerType === "OTHER"}
              disabled={!canManage}
              onChange={() => updateForm({ signerType: "OTHER" })}
              type="radio"
            />
            Khác
          </label>
        </div>
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Tên người ký <span className="text-danger">*</span></label>
            <Input disabled={!canManage} onChange={(event) => updateForm({ signerName: event.target.value })} value={form.signerName} />
          </div>
          {form.signerType === "OTHER" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Chức danh <span className="text-danger">*</span></label>
              <Input disabled={!canManage} onChange={(event) => updateForm({ signerTitle: event.target.value })} value={form.signerTitle} />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Chức danh</label>
              <Input disabled value="Linh mục tuyên úy" />
            </div>
          )}
        </div>
      </Panel>

      <Panel className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Ảnh nền & bố cục mail merge</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setPreview((value) => !value)} size="sm" type="button" variant={preview ? "primary" : "outline"}>
              <Eye size={16} /> {preview ? "Đang xem trước" : "Xem trước"}
            </Button>
            <label
              className={cn(
                "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary",
                !canManage && "pointer-events-none opacity-60",
              )}
            >
              <UploadSimple size={16} />
              {form.backgroundImage ? "Đổi ảnh nền" : "Tải ảnh nền"}
              <input accept="image/*" className="sr-only" disabled={!canManage} onChange={handleUpload} type="file" />
            </label>
          </div>
        </div>

        {canManage ? (
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
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <CertificateCanvas
            backgroundImage={form.backgroundImage}
            layout={form.layout}
            fieldLabel={fieldLabel}
            sampleValue={sampleValue}
            preview={preview}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onMove={(index, x, y) => updateItem(index, { x, y })}
            editable={canManage && !preview}
          />

          <div className="space-y-3">
            {selected ? (
              <div className="space-y-3 rounded-[10px] border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {selected.type === "TEXT" ? "Văn bản tĩnh" : fieldLabel(selected.fieldKey)}
                  </span>
                  <Button disabled={!canManage} onClick={() => selectedIndex != null && removeItem(selectedIndex)} size="sm" type="button" variant="ghost">
                    <Trash size={16} />
                  </Button>
                </div>
                {selected.type === "TEXT" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Nội dung</label>
                    <Input disabled={!canManage} onChange={(event) => selectedIndex != null && updateItem(selectedIndex, { text: event.target.value })} value={selected.text ?? ""} />
                  </div>
                ) : null}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Phông chữ</label>
                  <select
                    className="h-10 w-full rounded-[8px] border border-border bg-white px-2 text-sm"
                    disabled={!canManage}
                    onChange={(event) => selectedIndex != null && updateItem(selectedIndex, { fontFamily: event.target.value as FontFamily })}
                    value={selected.fontFamily}
                  >
                    <option value="sans">Không chân (Sans)</option>
                    <option value="serif">Có chân (Serif)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Cỡ chữ (%)</label>
                    <Input
                      disabled={!canManage}
                      max={30}
                      min={1}
                      onChange={(event) => selectedIndex != null && updateItem(selectedIndex, { fontSize: clamp(Number(event.target.value) / 100, 0.005, 0.3) })}
                      type="number"
                      value={Math.round(selected.fontSize * 100)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Màu chữ</label>
                    <input
                      className="h-10 w-full rounded-[8px] border border-border"
                      disabled={!canManage}
                      onChange={(event) => selectedIndex != null && updateItem(selectedIndex, { color: event.target.value })}
                      type="color"
                      value={selected.color}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted">Canh lề</label>
                    <select
                      className="h-10 w-full rounded-[8px] border border-border bg-white px-2 text-sm"
                      disabled={!canManage}
                      onChange={(event) => selectedIndex != null && updateItem(selectedIndex, { align: event.target.value as LayoutItem["align"] })}
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
                    <input
                      checked={selected.bold}
                      disabled={!canManage}
                      onChange={(event) => selectedIndex != null && updateItem(selectedIndex, { bold: event.target.checked })}
                      type="checkbox"
                    />
                    In đậm
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      checked={selected.italic}
                      disabled={!canManage}
                      onChange={(event) => selectedIndex != null && updateItem(selectedIndex, { italic: event.target.checked })}
                      type="checkbox"
                    />
                    In nghiêng
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      checked={selected.underline}
                      disabled={!canManage}
                      onChange={(event) => selectedIndex != null && updateItem(selectedIndex, { underline: event.target.checked })}
                      type="checkbox"
                    />
                    Gạch chân
                  </label>
                </div>
              </div>
            ) : (
              <p className="rounded-[10px] border border-dashed border-border p-4 text-sm text-muted">
                Chọn một phần tử trên ảnh để chỉnh nội dung, cỡ chữ, màu và vị trí. Kéo phần tử để đổi vị trí.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!canSave || saveMutation.isPending} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
          Lưu cấu hình
        </Button>
        {isSpecificScope && canManage ? (
          <Button
            disabled={!canSave || setAsDefaultMutation.isPending}
            loading={setAsDefaultMutation.isPending}
            onClick={setAsDefault}
            type="button"
            variant="outline"
          >
            Đặt làm cấu hình chung
          </Button>
        ) : null}
        {!canManage ? <span className="text-sm text-muted">Bạn chỉ có quyền xem cấu hình này.</span> : null}
        {configsQuery.isError ? <span className="text-sm text-danger">{getApiErrorMessage(configsQuery.error)}</span> : null}
      </div>
    </div>
  );
}

// Ngưỡng hút (tỉ lệ) khi canh thẳng hàng.
const SNAP_THRESHOLD = 0.012;

function CertificateCanvas({
  backgroundImage,
  layout,
  fieldLabel,
  sampleValue,
  preview,
  selectedIndex,
  onSelect,
  onMove,
  editable,
}: {
  backgroundImage: string;
  layout: LayoutItem[];
  fieldLabel: (key?: string) => string;
  sampleValue: (key?: string) => string;
  preview: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onMove: (index: number, x: number, y: number) => void;
  editable: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Hút toạ độ về tâm (0.5) hoặc trùng với phần tử khác để canh thẳng hàng ngang/dọc.
  function snap(value: number, index: number, axis: "x" | "y") {
    const targets = [0.5, ...layout.filter((_, i) => i !== index).map((item) => item[axis])];
    let snapped = value;
    let guide: number | null = null;
    let best = SNAP_THRESHOLD;
    for (const target of targets) {
      const distance = Math.abs(value - target);
      if (distance <= best) {
        best = distance;
        snapped = target;
        guide = target;
      }
    }
    return { snapped, guide };
  }

  function handlePointerDown(event: React.PointerEvent, index: number) {
    if (!editable) return;
    onSelect(index);
    dragIndex.current = index;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (dragIndex.current == null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const rawY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const sx = snap(rawX, dragIndex.current, "x");
    const sy = snap(rawY, dragIndex.current, "y");
    setGuides({ x: sx.guide, y: sy.guide });
    onMove(dragIndex.current, sx.snapped, sy.snapped);
  }

  function handlePointerUp() {
    dragIndex.current = null;
    setGuides({ x: null, y: null });
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-[10px] border border-border bg-surface-2"
      style={{ aspectRatio: "1.414 / 1", containerType: "size" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {backgroundImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="Ảnh nền chứng nhận" className="absolute inset-0 h-full w-full object-contain" src={backgroundImage} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted">Chưa có ảnh nền</div>
      )}
      {guides.x != null ? <div className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary/70" style={{ left: `${guides.x * 100}%` }} /> : null}
      {guides.y != null ? <div className="pointer-events-none absolute right-0 left-0 z-20 h-px bg-primary/70" style={{ top: `${guides.y * 100}%` }} /> : null}
      {layout.map((item, index) => {
        const label = item.type === "TEXT" ? item.text ?? "" : preview ? sampleValue(item.fieldKey) : `[${fieldLabel(item.fieldKey)}]`;
        const isSelected = !preview && index === selectedIndex;
        const translate = item.align === "center" ? "-50%" : item.align === "right" ? "-100%" : "0";
        return (
          <div
            key={index}
            onPointerDown={(event) => handlePointerDown(event, index)}
            className={cn(
              "absolute max-w-[90%] whitespace-nowrap px-1 leading-tight",
              isSelected ? "outline-dashed outline-2 outline-primary" : "",
              editable ? "cursor-move" : "cursor-default",
            )}
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              transform: `translate(${translate}, -50%)`,
              fontSize: `clamp(8px, ${item.fontSize * 100}cqh, 80px)`,
              color: item.color,
              fontFamily: item.fontFamily === "serif" ? "Georgia, 'Times New Roman', serif" : "Arial, Helvetica, sans-serif",
              fontWeight: item.bold ? 700 : 400,
              fontStyle: item.italic ? "italic" : "normal",
              textDecoration: item.underline ? "underline" : "none",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

function normalizeItem(item: LayoutItem): LayoutItem {
  return {
    type: item.type === "TEXT" ? "TEXT" : "FIELD",
    fieldKey: item.fieldKey,
    text: item.text,
    x: typeof item.x === "number" ? item.x : 0.5,
    y: typeof item.y === "number" ? item.y : 0.5,
    fontSize: typeof item.fontSize === "number" && item.fontSize > 0 ? item.fontSize : 0.04,
    color: item.color || "#000000",
    align: item.align === "left" || item.align === "right" ? item.align : "center",
    fontFamily: item.fontFamily === "serif" ? "serif" : "sans",
    bold: Boolean(item.bold),
    italic: Boolean(item.italic),
    underline: Boolean(item.underline),
  };
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
