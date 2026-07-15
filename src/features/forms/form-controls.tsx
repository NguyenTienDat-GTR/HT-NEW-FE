"use client";

import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { Input } from "@/components/ui/input";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { optionFromRow, rowsFromResponse } from "./api-utils";
import type { FormFieldSpec } from "./types";

type FormValue = string | string[] | number | boolean | null | undefined;

type FieldProps = {
  field: FormFieldSpec;
  value: FormValue;
  mode: "create" | "edit";
  onChange: (value: FormValue) => void;
  error?: string;
};

export function FormField({ field, value, mode, onChange, error }: FieldProps) {
  const readonly = mode === "edit" && field.readOnlyOnEdit;
  const type = field.type ?? "text";
  const id = `field-${field.name}`;
  const clearing = value === "__CLEAR__";

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground" htmlFor={id}>
        {field.label} {field.required ? <span className="text-danger">*</span> : null}
      </label>
      {renderControl({ field, id, type, value: clearing ? "" : value, readonly: readonly || clearing, onChange })}
      {mode === "edit" && field.clearable ? (
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
          <input
            checked={clearing}
            className="h-4 w-4 accent-primary"
            disabled={readonly}
            onChange={(event) => onChange(event.target.checked ? "__CLEAR__" : "")}
            type="checkbox"
          />
          Xóa giá trị khi lưu
        </label>
      ) : null}
      {field.helper ? <p className="text-xs leading-5 text-muted">{field.helper}</p> : null}
      {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}

function renderControl({
  field,
  id,
  type,
  value,
  readonly,
  onChange,
}: {
  field: FormFieldSpec;
  id: string;
  type: string;
  value: FormValue;
  readonly: boolean | undefined;
  onChange: (value: FormValue) => void;
}) {
  if (type === "textarea") {
    return (
      <textarea
        className="min-h-28 w-full rounded-[8px] border border-border bg-white px-3 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-1 disabled:opacity-70"
        disabled={readonly}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        value={String(value ?? "")}
      />
    );
  }

  if (type === "select" || type === "multiselect" || type === "radio") {
    return <OptionControl field={field} id={id} multiple={type === "multiselect"} onChange={onChange} readonly={readonly} radio={type === "radio"} value={value} />;
  }

  return (
    <Input
      disabled={readonly}
      id={id}
      onChange={(event) => onChange(type === "number" ? numericValue(event.target.value) : event.target.value)}
      placeholder={field.placeholder}
      type={type === "datetime" ? "datetime-local" : type}
      value={String(value ?? "")}
    />
  );
}

function OptionControl({
  field,
  id,
  multiple,
  radio,
  readonly,
  value,
  onChange,
}: {
  field: FormFieldSpec;
  id: string;
  multiple?: boolean;
  radio?: boolean;
  readonly?: boolean;
  value: FormValue;
  onChange: (value: FormValue) => void;
}) {
  const query = useQuery({
    queryKey: ["field-options", field.name, field.optionsEndpoint],
    enabled: Boolean(field.optionsEndpoint),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>(`${field.optionsEndpoint}?page=0&size=100`),
  });
  const apiOptions = rowsFromResponse(query.data).map((row) => optionFromRow(row, field.optionValue, field.optionLabel));
  const options = field.options ?? apiOptions;

  if (radio) {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2 text-sm transition-colors",
              value === option.value ? "border-primary bg-primary/8 text-primary" : "border-border bg-white text-foreground",
              (readonly || option.disabled) && "cursor-not-allowed opacity-60",
            )}
            key={option.value}
          >
            <input
              checked={value === option.value}
              className="h-4 w-4 accent-primary"
              disabled={readonly || option.disabled}
              name={field.name}
              onChange={() => onChange(option.value)}
              type="radio"
            />
            <span>
              <span className="block font-semibold">{option.label}</span>
              {option.disabledReason ? <span className="text-xs text-muted">{option.disabledReason}</span> : null}
            </span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <select
      className="h-11 w-full rounded-[8px] border border-border bg-white px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-1 disabled:opacity-70"
      disabled={readonly || query.isLoading}
      id={id}
      multiple={multiple}
      onChange={(event) => {
        if (multiple) onChange(Array.from(event.target.selectedOptions).map((option) => option.value));
        else onChange(event.target.value);
      }}
      value={multiple ? (Array.isArray(value) ? value : []) : String(value ?? "")}
    >
      {!multiple ? <option value="">Chọn</option> : null}
      {options.map((option) => (
        <option disabled={option.disabled} key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function numericValue(value: string) {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}
