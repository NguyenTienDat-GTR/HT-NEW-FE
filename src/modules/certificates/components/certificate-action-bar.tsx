"use client";

import { Copy, Star, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import type {  } from "@/config/routes/routes";
import { type ConfigResponse } from "./certificate-design";

type Action = { isPending: boolean; mutate: () => void };

export function CertificateActionBar({
  busy,
  canCreate,
  canDelete,
  canEditCurrent,
  canUpdate,
  deleteConfig,
  deleteMutation,
  dirty,
  isNew,
  nameTooLong,
  saveAsNewMutation,
  saveMutation,
  selectedConfig,
  setAsDefault,
  setDefaultMutation,
}: {
  busy: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canEditCurrent: boolean;
  canUpdate: boolean;
  deleteConfig: () => void;
  deleteMutation: Action;
  dirty: boolean;
  isNew: boolean;
  nameTooLong: boolean;
  saveAsNewMutation: Action;
  saveMutation: Action;
  selectedConfig: ConfigResponse | null;
  setAsDefault: () => void;
  setDefaultMutation: Action;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
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
  );
}
