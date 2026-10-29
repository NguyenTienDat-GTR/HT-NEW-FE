"use client";

import { useState } from "react";
import { Camera, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/common/media-image";
import { Panel } from "@/components/ui/panel";
import { AvatarLightbox } from "@/components/common/avatar-lightbox";
import { AvatarUploadDialog } from "@/components/common/avatar-upload-dialog";
import type { AuthUser } from "@/lib/auth/auth-store";
import { FormSections } from "./form-sections";
import type { FormFieldSpec, ResourceFormMode } from "./types";

type FormValue = string | string[] | number | boolean | null | undefined;

// Giá trị ẩn trong form giữ id ảnh vừa tải lên; backend chỉ nhận id này, không nhận URL ảnh.
const IMAGE_ASSET_FIELD = "imageAssetId";

// Huynh trưởng: ảnh đại diện cố định bên trái, các nhóm thông tin xếp bên phải trong cùng một trang (không chia bước).
export function LeaderFormLayout({
  fields,
  imageField,
  mode,
  values,
  errors,
  user,
  onChange,
  onFieldChange,
}: {
  fields: FormFieldSpec[];
  imageField?: FormFieldSpec;
  mode: ResourceFormMode;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  user: AuthUser | null;
  onChange: (field: FormFieldSpec, value: FormValue) => void;
  onFieldChange: (fieldName: string, value: FormValue) => void;
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      {imageField ? (
        <Panel className="p-4 lg:sticky lg:top-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold leading-5 text-foreground">
            <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
            Ảnh đại diện
          </h2>
          <AvatarPicker
            onChange={(url, assetId) => {
              onChange(imageField, url);
              onFieldChange(IMAGE_ASSET_FIELD, assetId);
            }}
            value={values[imageField.name] as string | null | undefined}
          />
        </Panel>
      ) : null}
      <FormSections errors={errors} fields={fields} mode={mode} onChange={onChange} onFieldChange={onFieldChange} user={user} values={values} />
    </div>
  );
}

function AvatarPicker({ value, onChange }: { value?: string | null; onChange: (url: string, assetId: string) => void }) {
  const imageSource = typeof value === "string" && value && value !== "__CLEAR__" ? value : "";
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      <AvatarLightbox name="Ảnh đại diện" src={imageSource}>
        <MediaImage
          alt="Ảnh đại diện đã chọn"
          className="block h-24 w-24 rounded-full border-2 border-white ring-1 ring-border"
          fallback={
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Camera size={30} weight="duotone" />
            </span>
          }
          src={imageSource}
        />
      </AvatarLightbox>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => setDialogOpen(true)} size="sm" type="button" variant="outline">
          <UploadSimple size={16} />
          {imageSource ? "Đổi ảnh" : "Chọn ảnh"}
        </Button>
      </div>
      <AvatarUploadDialog
        currentUrl={imageSource}
        onOpenChange={setDialogOpen}
        onUploaded={(result) => onChange(result.url, result.assetId)}
        open={dialogOpen}
      />
    </div>
  );
}
