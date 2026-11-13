"use client";

import { ArrowCounterClockwise, FileArrowUp, FileXls, FloppyDisk, MagicWand, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Workbook } from "exceljs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/common/resource/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Panel } from "@/components/ui/panel";
import type { RouteConfig } from "@/config/routes/routes";
import { apiFetch, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix, isSuperAdmin } from "@/lib/auth/permissions";
import {
  deleteRegistrationTemplate,
  downloadTemplateFile,
  fetchRegistrationTemplate,
  fetchTemplateBuffer,
  fetchTemplateFields,
  saveTemplateFile,
  type TemplateUnit,
  type TemplateUnitType,
} from "../api";
import { useDesignerFullscreen } from "@/modules/layout-config/wysiwyg/use-fullscreen";
import { starterLayout } from "../sheet-model";
import { SpreadsheetEditor, type SpreadsheetHandle } from "./spreadsheet-editor";

const QUERY_KEY = "registration-template";

async function loadWorkbook(buffer?: ArrayBuffer): Promise<Workbook> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  if (buffer) await workbook.xlsx.load(buffer);
  if (!workbook.worksheets.length) workbook.addWorksheet("Danh sách đăng ký");
  return workbook;
}

/**
 * Mẫu danh sách đăng ký của giáo phận / giáo hạt (mỗi cấp một mẫu): soạn trực tiếp như Excel ngay trên trang, kéo thả trường vào ô.
 * Dùng khi xuất danh sách đăng ký của từng khóa; cấp đơn vị (Liên đoàn / Hiệp đoàn / Xứ đoàn) hiển thị theo cấp quản lý của khóa.
 */
export function RegistrationTemplateView({ route }: { route?: RouteConfig }) {
  const user = useAuthStore((state) => state.user);
  const superAdmin = isSuperAdmin(user);
  const canUpdate = superAdmin || hasPermissionPrefix(user, "training.registration_template.update.");
  const queryClient = useQueryClient();
  const editor = useRef<SpreadsheetHandle>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [unitType, setUnitType] = useState<TemplateUnitType>("DIOCESE");
  const [unitId, setUnitId] = useState("");
  const [dirty, setDirty] = useState(false);
  const [local, setLocal] = useState<{ key: string; workbook: Workbook; version: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revision, setRevision] = useState(0);
  // Toàn màn hình (cùng cơ chế với cấu hình chứng nhận) giữ ở đây vì trình soạn được dựng lại khi nạp file / lưu / hủy thay đổi.
  const screen = useDesignerFullscreen();
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  const unit: TemplateUnit = superAdmin && unitId ? { unitType, unitId } : null;
  const ready = !superAdmin || Boolean(unitId);

  const unitsQuery = useQuery({
    queryKey: ["registration-template-units", unitType],
    queryFn: () => apiFetch<PageResponse<{ id: string; name: string }>>(`${unitType === "DIOCESE" ? "/dioceses" : "/deaneries"}?page=0&size=200&sortBy=name`),
    enabled: superAdmin,
  });
  const templateQuery = useQuery({ queryKey: [QUERY_KEY, unit], queryFn: () => fetchRegistrationTemplate(unit), enabled: ready });
  const fieldsQuery = useQuery({ queryKey: [QUERY_KEY, "fields"], queryFn: fetchTemplateFields, staleTime: 60 * 60 * 1000 });
  const template = templateQuery.data;
  const templateKey = `${template?.unitType}|${template?.unitId}|${template?.updatedAt ?? "new"}`;

  const remoteQuery = useQuery({
    queryKey: [QUERY_KEY, "workbook", templateKey],
    queryFn: async () => loadWorkbook(template?.configured ? await fetchTemplateBuffer(unit) : undefined),
    enabled: Boolean(template),
    staleTime: Infinity,
    gcTime: 0,
  });
  const useLocal = local?.key === templateKey;
  const workbook = useLocal ? local.workbook : remoteQuery.data;
  const editorKey = `${templateKey}|${useLocal ? local.version : "remote"}|${revision}`;

  // Cảnh báo khi đóng / tải lại trang lúc còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const confirmDiscard = () => !dirty || window.confirm("Mẫu đang có thay đổi chưa lưu. Bỏ các thay đổi này?");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  const saveMutation = useMutation({
    mutationFn: async () => saveTemplateFile(await editor.current!.getBuffer(), unit),
    onSuccess: () => {
      toast.success("Đã lưu mẫu danh sách đăng ký");
      setDirty(false);
      setLocal(null);
      void invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error), { duration: 10000 }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteRegistrationTemplate(unit),
    onSuccess: () => {
      toast.success("Đã xóa mẫu danh sách đăng ký");
      setConfirmDelete(false);
      setDirty(false);
      setLocal(null);
      void invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error)),
  });

  // Bỏ mọi thay đổi chưa lưu: nạp lại đúng bản đã lưu trên hệ thống.
  async function revertToSaved() {
    if (!window.confirm("Bỏ toàn bộ thay đổi chưa lưu và quay về bản đã lưu?")) return;
    setLocal(null);
    setDirty(false);
    await remoteQuery.refetch();
    setRevision((value) => value + 1);
  }

  async function applyStarter() {
    if (dirty && !window.confirm("Nội dung đang soạn sẽ bị thay bằng bố cục gợi ý. Tiếp tục?")) return;
    const fresh = await loadWorkbook();
    starterLayout(fresh.worksheets[0]);
    setLocal({ key: templateKey, workbook: fresh, version: Date.now() });
    setDirty(true);
  }

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Chỉ hỗ trợ file Excel định dạng .xlsx");
      return;
    }
    if (dirty && !window.confirm("Nội dung đang soạn sẽ bị thay bằng file đã chọn. Tiếp tục?")) return;
    try {
      setLocal({ key: templateKey, workbook: await loadWorkbook(await file.arrayBuffer()), version: Date.now() });
      setDirty(true);
      toast.info("Đã nạp file vào trình soạn. Chỉnh sửa rồi bấm Lưu mẫu.");
    } catch {
      toast.error("Không đọc được file. Hãy lưu lại bằng Excel dưới dạng .xlsx rồi thử lại.");
    }
  }

  const actions = template && workbook ? (
    <>
            {template.configured ? (
              <Button onClick={() => void downloadTemplateFile(template.fileName ?? "mau-danh-sach-dang-ky.xlsx", unit).catch((error: unknown) => toast.error(getApiErrorMessage(error)))} size="sm" type="button" variant="outline">
                <FileXls size={16} /> Tải file về
              </Button>
            ) : null}
            {canUpdate ? (
              <>
                <input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={importFile} ref={importInput} type="file" />
                <Button onClick={() => void applyStarter()} size="sm" type="button" variant="outline">
                  <MagicWand size={16} /> Bố cục gợi ý
                </Button>
                <Button onClick={() => importInput.current?.click()} size="sm" type="button" variant="outline">
                  <FileArrowUp size={16} /> Nạp từ file Excel
                </Button>
                {template.configured && dirty ? (
                  <Button onClick={() => void revertToSaved()} size="sm" type="button" variant="outline">
                    <ArrowCounterClockwise size={16} /> Hủy thay đổi
                  </Button>
                ) : null}
                {template.configured ? (
                  <Button onClick={() => setConfirmDelete(true)} size="sm" type="button" variant="ghost">
                    <Trash size={16} /> Xóa mẫu
                  </Button>
                ) : null}
                <Button disabled={!dirty} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} size="sm" type="button" variant="primary">
                  <FloppyDisk size={16} /> Lưu mẫu
                </Button>
              </>
            ) : null}
          </>
  ) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-bold leading-7 text-foreground">{route?.title ?? "Mẫu danh sách đăng ký"}</h1>
        {route?.subtitle ? <HelpTip label="Mô tả màn hình">{route.subtitle}</HelpTip> : null}
        {superAdmin ? (
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Cấp mẫu"
              className="h-9 rounded-lg border border-input bg-white px-3 text-sm"
              onChange={(event) => {
                if (!confirmDiscard()) return;
                setUnitType(event.target.value as TemplateUnitType);
                setUnitId("");
                setLocal(null);
                setDirty(false);
              }}
              value={unitType}
            >
              <option value="DIOCESE">Mẫu cấp giáo phận</option>
              <option value="DEANERY">Mẫu cấp giáo hạt</option>
            </select>
            <select
              aria-label="Đơn vị"
              className="h-9 rounded-lg border border-input bg-white px-3 text-sm"
              onChange={(event) => {
                if (!confirmDiscard()) return;
                setUnitId(event.target.value);
                setLocal(null);
                setDirty(false);
              }}
              value={unitId}
            >
              <option value="">{unitType === "DIOCESE" ? "Chọn giáo phận..." : "Chọn giáo hạt..."}</option>
              {(unitsQuery.data?.content ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : template ? (
          <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">{template.unitName}</span>
        ) : null}
      </div>

      {!ready ? (
        <Panel className="p-6 text-sm text-muted">Chọn giáo phận hoặc giáo hạt để soạn mẫu danh sách đăng ký.</Panel>
      ) : templateQuery.isError ? (
        <Panel className="p-6 text-sm text-danger">{getApiErrorMessage(templateQuery.error)}</Panel>
      ) : !template || !workbook ? (
        <Panel className="p-6 text-sm text-muted">{remoteQuery.isError ? getApiErrorMessage(remoteQuery.error) : "Đang tải..."}</Panel>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 text-muted">
            {template.configured ? (
              <>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">Đang chỉnh sửa mẫu đã lưu</span>
                <span>
                  {template.unitName}
                  {template.updatedAt ? ` · lưu lần cuối ${new Date(template.updatedAt).toLocaleString("vi-VN")}` : ""}
                  {template.updatedBy ? ` bởi ${template.updatedBy}` : ""}
                </span>
              </>
            ) : (
              <span>{template.unitName} chưa có mẫu: bấm Bố cục gợi ý để bắt đầu, hoặc tự soạn từ trang trống.</span>
            )}
            {dirty ? <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700">Có thay đổi chưa lưu (Ctrl+S để lưu)</span> : null}
            <span>Khóa cấp giáo hạt dùng mẫu của giáo hạt, chưa có thì dùng mẫu của giáo phận.</span>
          </div>
          <SpreadsheetEditor actions={actions} fullscreen={screen.fullscreen} onToggleFullscreen={screen.toggle} onSave={() => dirtyRef.current && !saveMutation.isPending && saveMutation.mutate()} fields={fieldsQuery.data ?? []} key={editorKey} onDirty={() => setDirty(true)} readOnly={!canUpdate} ref={editor} workbook={workbook} />
        </>
      )}

      <ConfirmActionDialog
        action="toggle"
        confirmLabel="Xóa mẫu"
        description="Xóa mẫu danh sách đăng ký của đơn vị này. Sau khi xóa, khóa dùng mẫu của cấp trên (nếu có)."
        loading={deleteMutation.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        open={confirmDelete}
        requireConfirmText={false}
        title="Xóa mẫu danh sách đăng ký?"
      />
    </div>
  );
}
