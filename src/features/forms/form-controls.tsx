"use client";

import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useMemo, useState } from "react";
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
  const readonly = (mode === "create" && field.readOnlyOnCreate && value !== undefined && value !== null && value !== "") || (mode === "edit" && field.readOnlyOnEdit);
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

  if (type === "select" || type === "multiselect" || type === "checkbox-list" || type === "radio") {
    return (
      <OptionControl
        checkboxList={type === "checkbox-list"}
        field={field}
        id={id}
        multiple={type === "multiselect"}
        onChange={onChange}
        readonly={readonly}
        radio={type === "radio"}
        value={value}
      />
    );
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
  checkboxList,
  radio,
  readonly,
  value,
  onChange,
}: {
  field: FormFieldSpec;
  id: string;
  multiple?: boolean;
  checkboxList?: boolean;
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

  if (checkboxList) {
    return <CheckboxList fieldName={field.name} onChange={onChange} options={options} readonly={readonly || query.isLoading} value={Array.isArray(value) ? value : []} />;
  }

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

function CheckboxList({
  fieldName,
  onChange,
  options,
  readonly,
  value,
}: {
  fieldName: string;
  onChange: (value: FormValue) => void;
  options: Array<{ value: string; label: string; group?: string; disabled?: boolean; disabledReason?: string }>;
  readonly?: boolean;
  value: string[];
}) {
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter((option) => `${option.label} ${option.value} ${option.group ?? ""}`.toLowerCase().includes(keyword));
  }, [options, search]);
  const groups = useMemo(() => {
    const map = new Map<string, typeof options>();
    filteredOptions.forEach((option) => {
      const group = option.group ?? "Khác";
      map.set(group, [...(map.get(group) ?? []), option]);
    });
    return Array.from(map.entries());
  }, [filteredOptions]);

  function setSelected(next: Set<string>) {
    onChange(Array.from(next));
  }

  function toggle(valueToToggle: string) {
    const next = new Set(selected);
    if (next.has(valueToToggle)) next.delete(valueToToggle);
    else next.add(valueToToggle);
    setSelected(next);
  }

  function selectGroup(groupOptions: typeof options, checked: boolean) {
    const next = new Set(selected);
    groupOptions.filter((option) => !option.disabled).forEach((option) => {
      if (checked) next.add(option.value);
      else next.delete(option.value);
    });
    setSelected(next);
  }

  return (
    <div className="rounded-[10px] border border-border bg-white">
      <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input disabled={readonly} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã hoặc tên quyền" value={search} />
        <span className="shrink-0 rounded-[8px] bg-primary/8 px-3 py-2 text-sm font-semibold text-primary">{selected.size} đã chọn</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-3">
        {groups.length === 0 ? <p className="py-6 text-center text-sm text-muted">Không có quyền phù hợp</p> : null}
        {groups.map(([group, groupOptions]) => {
          const enabledOptions = groupOptions.filter((option) => !option.disabled);
          const allChecked = enabledOptions.length > 0 && enabledOptions.every((option) => selected.has(option.value));
          return (
            <section className="mb-4 last:mb-0" key={group}>
              <div className="mb-2 flex flex-col gap-2 rounded-[8px] bg-surface-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-foreground">{group}</p>
                <button
                  className="text-left text-xs font-semibold text-primary disabled:text-muted sm:text-right"
                  disabled={readonly || enabledOptions.length === 0}
                  onClick={() => selectGroup(enabledOptions, !allChecked)}
                  type="button"
                >
                  {allChecked ? "Bỏ chọn nhóm" : "Chọn cả nhóm"}
                </button>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {groupOptions.map((option) => (
                  <label
                    className={cn(
                      "flex min-h-14 cursor-pointer items-start gap-3 rounded-[8px] border px-3 py-2 text-sm transition-colors",
                      selected.has(option.value) ? "border-primary bg-primary/8 text-primary" : "border-border bg-white text-foreground",
                      (readonly || option.disabled) && "cursor-not-allowed opacity-60",
                    )}
                    key={option.value}
                  >
                    <input
                      checked={selected.has(option.value)}
                      className="mt-1 h-4 w-4 accent-primary"
                      disabled={readonly || option.disabled}
                      name={fieldName}
                      onChange={() => toggle(option.value)}
                      type="checkbox"
                    />
                    <span className="min-w-0">
                      <span className="block break-words font-semibold">{option.label}</span>
                      <span className="block break-words text-xs text-muted">{option.value}</span>
                      {option.disabledReason ? <span className="text-xs text-muted">{option.disabledReason}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function numericValue(value: string) {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}
