"use client";

import { Camera, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { AuthUser } from "@/lib/auth/auth-store";
import { FormSections } from "./form-sections";
import type { FormFieldSpec, ResourceFormMode } from "./types";

type FormValue = string | string[] | number | boolean | null | undefined;

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
            onChange={(value) => onChange(imageField, value)}
            onClear={() => onChange(imageField, mode === "edit" ? "__CLEAR__" : "")}
            value={values[imageField.name] as string | null | undefined}
          />
        </Panel>
      ) : null}
      <FormSections errors={errors} fields={fields} mode={mode} onChange={onChange} onFieldChange={onFieldChange} user={user} values={values} />
    </div>
  );
}

function AvatarPicker({ value, onChange, onClear }: { value?: string | null; onChange: (value: string) => void; onClear: () => void }) {
  const imageSource = typeof value === "string" && value && value !== "__CLEAR__" ? value : "";
  const inputId = "field-imageUrl";

  return (
    <div className="flex flex-col items-center gap-3">
      {imageSource ? (
        <span
          aria-label="Ảnh đại diện đã chọn"
          className="block h-24 w-24 shrink-0 rounded-full border-2 border-white bg-cover bg-center ring-1 ring-border"
          role="img"
          style={{ backgroundImage: `url(${imageSource})` }}
        />
      ) : (
        <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Camera size={30} weight="duotone" />
        </span>
      )}
      <input
        accept="image/*"
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") onChange(reader.result);
          };
          reader.readAsDataURL(file);
          event.target.value = "";
        }}
        type="file"
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <label
          className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-foreground transition-colors hover:bg-slate-50 hover:text-primary"
          htmlFor={inputId}
        >
          <UploadSimple size={16} />
          {imageSource ? "Đổi ảnh" : "Chọn ảnh"}
        </label>
        {imageSource ? (
          <Button onClick={onClear} size="sm" type="button" variant="ghost">
            Xóa ảnh
          </Button>
        ) : null}
      </div>
    </div>
  );
}
