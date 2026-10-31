"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HelpTip } from "@/components/ui/help-tip";
import { apiFetch } from "@/lib/api/client";
import { NEW_CONFIG, useConfigLibrary } from "@/modules/layout-config/use-config-library";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/config/routes/routes";
import { useUndoHistory } from "../undo-history";
import { fieldItem, photoItem, qrItem, textItem } from "../certificate-layout-items";
import { useCertificateLibraryState } from "../use-certificate-library-state";
import { useUndoRedoShortcuts } from "@/modules/layout-config/use-undo-redo-shortcuts";
import { CertificateLibraryPanel } from "./certificate-library-panel";
import { CertificateDesignerPanel } from "./certificate-designer-panel";
import { CertificateActionBar } from "./certificate-action-bar";
import { SCOPE_LABELS, blankForm, MAX_NAME_LENGTH, formFromConfig, isSameForm, useCertificateFonts, type ConfigResponse, type CourseTypeRef, type DesignForm, type FieldCatalogItem, type LayoutItem } from "./certificate-design";
import { Callout } from "@/modules/layout-config/form-controls";

// Giá trị selectedId khi đang soạn một cấu hình chưa lưu.


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

  const courseTypesQuery = useQuery({
    queryKey: ["certificate-config", "course-types"],
    enabled: Boolean(user),
    queryFn: () => apiFetch<CourseTypeRef[]>("/certificates/config/course-types"),
  });

  const library = useCertificateLibraryState();
  const { libraryParams } = library;
  const { api, fieldsQuery, libraryQuery, resolvedId, isNew, selectedConfig } = useConfigLibrary<ConfigResponse, FieldCatalogItem>({
    basePath: "/certificates/config",
    queryRoot: "certificate-config",
    selectedId,
    libraryParams,
  });




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
      layout: [...current.layout, fieldItem(addFieldKey)],
    }));
    setSelectedIndex(form.layout.length);
    setAddFieldKey("");
  }

  function addText() {
    history.set((current) => ({
      ...current,
      layout: [...current.layout, textItem()],
    }));
    setSelectedIndex(form.layout.length);
  }

  // Chỉ khi bố cục có phần tử QR thì khi xuất PDF mới sinh mã QR cho chứng nhận.
  function addQr() {
    history.set((current) => ({
      ...current,
      layout: [...current.layout, qrItem()],
    }));
    setSelectedIndex(form.layout.length);
  }

  // Ảnh đại diện của huynh trưởng nhận chứng nhận, lấy từ hồ sơ huynh trưởng lúc xuất PDF / xem trước.
  function addPhoto() {
    history.set((current) => ({
      ...current,
      layout: [...current.layout, photoItem()],
    }));
    setSelectedIndex(form.layout.length);
  }

  function removeItem(index: number) {
    history.set((current) => ({ ...current, layout: current.layout.filter((_, idx) => idx !== index) }));
    setSelectedIndex(null);
  }

  const [albumOpen, setAlbumOpen] = useState(false);

  // Ctrl+Z hoàn tác, Ctrl+Y / Ctrl+Shift+Z làm lại.
  const { undo, redo } = history;
  useUndoRedoShortcuts({ enabled: canEditCurrent, undo, redo });

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
        ? api.create(payload())
        : api.update(String(resolvedId), payload()),
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
      return api.create({ ...body, name: body.name || "Cấu hình chứng nhận" });
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
    mutationFn: () => api.setDefault(String(resolvedId)),
    onSuccess: async () => {
      toast.success("Đã đặt làm cấu hình chung");
      await refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.remove(String(resolvedId)),
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
      <CertificateLibraryPanel
        canCreate={canCreate}
        courseTypes={courseTypesQuery.data ?? []}
        fieldLabel={fieldLabel}
        isNew={isNew}
        library={library}
        libraryQuery={libraryQuery}
        resolvedId={resolvedId}
        selectConfig={selectConfig}
        startNew={startNew}
      />

      {!isNew && selectedConfig && !selectedConfig.editable ? (
        <Callout>
          Cấu hình này thuộc cấp {SCOPE_LABELS[selectedConfig.scopeLevel].toLowerCase()}, bạn chỉ được xem và dùng. Muốn chỉnh sửa, hãy lưu thành một cấu hình mới của bạn.
        </Callout>
      ) : null}

      {/* Trình thiết kế */}
      {ready ? (
        <CertificateDesignerPanel
          addField={addField}
          addFieldKey={addFieldKey}
          addPhoto={addPhoto}
          addQr={addQr}
          addText={addText}
          albumOpen={albumOpen}
          canEditCurrent={canEditCurrent}
          dirty={dirty}
          fieldLabel={fieldLabel}
          fieldsQuery={fieldsQuery}
          form={form}
          history={history}
          isNew={isNew}
          nameTooLong={nameTooLong}
          preview={preview}
          redo={redo}
          removeItem={removeItem}
          restoreSaved={restoreSaved}
          selected={selected}
          selectedConfig={selectedConfig}
          selectedIndex={selectedIndex}
          setAddFieldKey={setAddFieldKey}
          setAlbumOpen={setAlbumOpen}
          setPreview={setPreview}
          setSelectedIndex={setSelectedIndex}
          undo={undo}
          updateForm={updateForm}
          updateItem={updateItem}
        />
      ) : null}

      {/* Thanh thao tác cố định */}
      <CertificateActionBar
        busy={busy}
        canCreate={canCreate}
        canDelete={canDelete}
        canEditCurrent={canEditCurrent}
        canUpdate={canUpdate}
        deleteConfig={deleteConfig}
        deleteMutation={deleteMutation}
        dirty={dirty}
        isNew={isNew}
        nameTooLong={nameTooLong}
        saveAsNewMutation={saveAsNewMutation}
        saveMutation={saveMutation}
        selectedConfig={selectedConfig}
        setAsDefault={setAsDefault}
        setDefaultMutation={setDefaultMutation}
      />
    </div>
  );
}
