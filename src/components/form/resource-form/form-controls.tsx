"use client";

import { MediaImage } from "@/components/common/media-image";
import { AvatarLightbox } from "@/components/common/avatar-lightbox";
import { AvatarUploadDialog } from "@/components/common/avatar-upload-dialog";
import { ImageSquare, UploadSimple } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPermissionTaxonomyValue } from "@/components/common/resource/permission-taxonomy-labels";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { AuthUser } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";
import { optionFromRow, rowsFromResponse } from "./api-utils";
import { RegistrationListField, registrationEntries } from "./registration-list-field";
import type { FormFieldSpec, Option } from "./types";

type FormValue = string | string[] | number | boolean | null | undefined;

type FieldProps = {
  field: FormFieldSpec;
  value: FormValue;
  values?: Record<string, unknown>;
  user?: AuthUser | null;
  mode: "create" | "edit";
  onChange: (value: FormValue) => void;
  onFieldChange?: (fieldName: string, value: FormValue) => void;
  error?: string;
};

export function FormField({ field, value, values, user, mode, onChange, onFieldChange, error }: FieldProps) {
  const readonly = (mode === "create" && field.readOnlyOnCreate && value !== undefined && value !== null && value !== "") || (mode === "edit" && field.readOnlyOnEdit);
  const type = field.type ?? "text";
  const id = `field-${field.name}`;
  const clearing = value === "__CLEAR__";
  const dynamicHelper = useDynamicHelper(field, values);
  const tips = [field.helper, dynamicHelper && !dynamicHelper.invalid ? dynamicHelper.text : undefined].filter(Boolean) as string[];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="text-[13px] font-medium leading-5 text-text-secondary" htmlFor={id}>
          {field.label} {field.required ? <span className="text-danger">*</span> : null}
        </label>
        {tips.length ? (
          <HelpTip label={`Hướng dẫn: ${field.label}`}>
            {tips.map((tip) => (
              <p className="[&:not(:first-child)]:mt-1.5" key={tip}>
                {tip}
              </p>
            ))}
          </HelpTip>
        ) : null}
      </div>
      {renderControl({ field, id, type, value: clearing ? "" : value, values, user, readonly: readonly || clearing, onChange, onFieldChange })}
      {mode === "edit" && field.clearable ? (
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
          <input
            checked={clearing}
            className="h-4 w-4 accent-primary"
            disabled={readonly}
            onChange={(event) => onChange(event.target.checked ? "__CLEAR__" : "")}
            type="checkbox"
          />
          {field.clearLabel ?? "Xóa giá trị khi lưu"}
        </label>
      ) : null}
      {dynamicHelper?.invalid ? <p className="text-xs font-semibold leading-5 text-danger">{dynamicHelper.text}</p> : null}
      {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}

function renderControl({
  field,
  id,
  type,
  value,
  values,
  user,
  readonly,
  onChange,
  onFieldChange,
}: {
  field: FormFieldSpec;
  id: string;
  type: string;
  value: FormValue;
  values?: Record<string, unknown>;
  user?: AuthUser | null;
  readonly: boolean | undefined;
  onChange: (value: FormValue) => void;
  onFieldChange?: (fieldName: string, value: FormValue) => void;
}) {
  if (type === "textarea") {
    return (
      <textarea
        className="min-h-[72px] w-full rounded-[8px] border border-input bg-white px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] placeholder:text-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:bg-surface-1 disabled:opacity-70"
        disabled={readonly}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        value={String(value ?? "")}
      />
    );
  }

  if (type === "registration-list" && field.registrationList) {
    const config = field.registrationList;
    return (
      <RegistrationListField
        courseCode={String(values?.[config.courseField] ?? "")}
        mode={config.mode}
        onChange={(entries) => onChange(entries as unknown as FormValue)}
        otherEntries={registrationEntries(values?.[config.otherField])}
        readonly={readonly}
        value={value}
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
        onFieldChange={onFieldChange}
        readonly={readonly}
        radio={type === "radio"}
        user={user}
        values={values}
        value={value}
      />
    );
  }

  if (type === "switch") {
    const checked = value === true || value === "true";
    return (
      <button
        aria-checked={checked}
        className={cn(
          "flex min-h-10 w-full max-w-full cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-[8px] border px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:opacity-60",
          checked ? "border-primary bg-primary/8 text-primary" : "border-border bg-white text-foreground",
        )}
        disabled={readonly}
        id={id}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span className="min-w-0 text-left leading-5">{checked ? (field.switchLabels?.[0] ?? "Vai trò chính") : (field.switchLabels?.[1] ?? "Vai trò phụ")}</span>
        <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-border")}>
          <span className={cn("absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
        </span>
      </button>
    );
  }

  if (type === "image") {
    return <ImagePickerControl id={id} onChange={onChange} readonly={readonly} value={value} />;
  }

  return (
    <Input
      className="h-10"
      disabled={readonly}
      id={id}
      onChange={(event) => onChange(type === "number" ? numericValue(event.target.value) : event.target.value)}
      placeholder={field.placeholder}
      min={type === "number" ? field.min : undefined}
      type={type === "datetime" ? "datetime-local" : type}
      value={type === "datetime" ? toDatetimeLocalValue(value) : String(value ?? "")}
    />
  );
}

export function ImagePickerControl({
  id,
  value,
  readonly,
  onChange,
}: {
  id: string;
  value: FormValue;
  readonly?: boolean;
  onChange: (value: FormValue) => void;
}) {
  const imageSource = typeof value === "string" && value && value !== "__CLEAR__" ? value : "";
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-border bg-white p-2.5">
      <AvatarLightbox name="Ảnh đã chọn" src={imageSource}>
        <MediaImage
          alt="Ảnh đã chọn"
          className="block h-16 w-16 rounded-full border border-border"
          fallback={
            <div
              aria-hidden
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-1 text-muted"
            >
              <ImageSquare size={26} weight="duotone" />
            </div>
          }
          src={imageSource}
        />
      </AvatarLightbox>
      <button
        className={cn(
          "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-white px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary",
          readonly && "cursor-not-allowed opacity-60 hover:border-border hover:text-foreground",
        )}
        disabled={readonly}
        id={id}
        onClick={() => setDialogOpen(true)}
        type="button"
      >
        <UploadSimple size={16} />
        {imageSource ? "Đổi ảnh" : "Chọn ảnh"}
      </button>
      <AvatarUploadDialog currentUrl={imageSource} onOpenChange={setDialogOpen} onUploaded={(result) => onChange(result.url)} open={dialogOpen} />
    </div>
  );
}

function OptionControl({
  field,
  id,
  multiple,
  checkboxList,
  radio,
  readonly,
  values,
  user,
  value,
  onChange,
  onFieldChange,
}: {
  field: FormFieldSpec;
  id: string;
  multiple?: boolean;
  checkboxList?: boolean;
  radio?: boolean;
  readonly?: boolean;
  values?: Record<string, unknown>;
  user?: AuthUser | null;
  value: FormValue;
  onChange: (value: FormValue) => void;
  onFieldChange?: (fieldName: string, value: FormValue) => void;
}) {
  const [remoteSearchInput, setRemoteSearch] = useState("");
  // Tìm kiếm tùy chọn qua API chỉ gửi request khi người dùng ngừng nhập.
  const remoteSearch = useDebouncedValue(remoteSearchInput);
  const query = useQuery({
    queryKey: ["field-options", field.name, field.optionsEndpoint, field.optionSearchParam ? remoteSearch : ""],
    enabled: Boolean(field.optionsEndpoint),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>(optionEndpointWithPaging(field.optionsEndpoint, field.optionSearchParam, remoteSearch)),
  });
  const apiOptions = rowsFromResponse(query.data).map((row) => optionFromRow(row, field.optionValue, field.optionLabel, field.optionLabelFields));
  const excludedValues = new Set([...(field.excludeOptionValues ?? []), ...(field.excludeOptionValuesWhen?.(user ?? null) ?? [])]);
  const filteredOptions = (field.options ?? apiOptions).filter((option) => !excludedValues.has(option.value));
  const currentValue = !multiple && !checkboxList ? String(value ?? "") : "";
  // Nhớ nhãn của lựa chọn vừa chọn: khi danh sách đổi (tìm kiếm, đổi bộ lọc) mà giá trị đang chọn không còn trong đó
  // thì vẫn hiện đúng tên thay vì mã UUID.
  const [pickedOption, setPickedOption] = useState<{ value: string; label: string } | null>(null);
  const options = preserveCurrentOption(
    filteredOptions,
    currentValue,
    Boolean(field.optionsEndpoint && !field.options),
    field.currentLabel || (pickedOption?.value === currentValue ? pickedOption.label : undefined),
  );
  const handleSearchableChange = (next: FormValue) => {
    const picked = options.find((option) => option.value === String(next ?? ""));
    if (picked) setPickedOption({ value: picked.value, label: picked.label });
    onChange(next);
  };

  useEffect(() => {
    if (query.isLoading || field.options) return;
    const allowed = new Set(options.filter((option) => !option.disabled).map((option) => option.value));
    if (checkboxList || multiple) {
      if (!Array.isArray(value)) return;
      const next = value.filter((item) => allowed.has(item));
      if (next.length !== value.length) onChange(next);
      return;
    }
    if (field.searchable) return;
    const currentValue = String(value ?? "");
    if (currentValue && !allowed.has(currentValue)) onChange("");
  }, [checkboxList, field.options, field.searchable, multiple, onChange, options, query.isLoading, value]);

  if (checkboxList) {
    const primaryValue = field.primaryFieldName ? String(values?.[field.primaryFieldName] ?? "") : undefined;
    return (
      <CheckboxList
        fieldName={field.name}
        onChange={onChange}
        onPrimaryChange={field.primaryFieldName && onFieldChange ? (nextValue) => onFieldChange(field.primaryFieldName!, nextValue) : undefined}
        options={options}
        primaryLabel={field.primaryLabel}
        primaryValue={primaryValue}
        readonly={readonly || query.isLoading}
        value={Array.isArray(value) ? value : []}
      />
    );
  }

  if (radio) {
    return (
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label
            className={cn(
              "flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] border px-2.5 py-1.5 text-sm transition-colors",
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

  if (field.searchable && multiple) {
    return (
      <SearchableMultiSelect
        id={id}
        onChange={onChange}
        options={options}
        placeholder={field.placeholder}
        readonly={readonly || query.isLoading}
        value={Array.isArray(value) ? value : []}
      />
    );
  }

  if (field.searchable && !multiple) {
    return (
      <SearchableSelect
        id={id}
        onChange={handleSearchableChange}
        localFilter={!field.serverFiltered}
        onSearchChange={field.optionSearchParam ? setRemoteSearch : undefined}
        options={options}
        placeholder={field.placeholder}
        readonly={readonly}
        value={String(value ?? "")}
      />
    );
  }

  return (
    <select
      className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:bg-surface-1 disabled:opacity-70"
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

function preserveCurrentOption(options: Option[], currentValue: string, remoteOptions: boolean, currentLabel?: string) {
  if (!remoteOptions || !currentValue || options.some((option) => option.value === currentValue)) {
    return options;
  }
  return [{ value: currentValue, label: currentLabel || currentValue }, ...options];
}

function SearchableSelect({
  id,
  onChange,
  onSearchChange,
  localFilter = true,
  options,
  placeholder,
  readonly,
  value,
}: {
  id: string;
  onChange: (value: FormValue) => void;
  onSearchChange?: (value: string) => void;
  // false: server đã lọc theo từ khóa (có thể khớp ở trường không nằm trong nhãn) nên không lọc lại theo nhãn.
  localFilter?: boolean;
  options: Option[];
  placeholder?: string;
  readonly?: boolean;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    // Tìm trên server (onSearchChange): kết quả đã khớp từ khóa, lọc lại theo nhãn sẽ làm mất kết quả khớp ở trường khác.
    if (!keyword || !localFilter) return options;
    return options.filter((option) => normalizeSearchText(`${option.label} ${option.value} ${option.group ?? ""} ${(option.details ?? []).join(" ")}`).includes(normalizeSearchText(keyword)));
  }, [localFilter, options, search]);

  return (
    <div className="relative">
      <Input
        className="h-10 w-full min-w-0"
        title={selected?.label}
        disabled={readonly}
        id={id}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          const nextSearch = event.target.value;
          setSearch(nextSearch);
          onSearchChange?.(nextSearch);
          setOpen(true);
        }}
        onFocus={() => {
          setSearch("");
          onSearchChange?.("");
          setOpen(true);
        }}
        placeholder={placeholder ?? "Gõ tên để tìm nhanh"}
        value={open ? search : selected?.label ?? ""}
      />
      {open && !readonly ? (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-[8px] border border-border bg-white p-1 shadow-lg">
          {filteredOptions.length === 0 ? <p className="px-3 py-2 text-sm text-muted">Không có dữ liệu phù hợp</p> : null}
          {filteredOptions.map((option) => (
            <button
              className={cn(
                "block w-full rounded-[6px] px-3 py-2 text-left text-sm transition-colors hover:bg-primary/8",
                option.value === value && "bg-primary/10 text-primary",
                option.disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
              )}
              disabled={option.disabled}
              key={option.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setSearch("");
                setOpen(false);
              }}
              type="button"
            >
              <span className="block break-words font-semibold">{option.label}</span>
              {option.details && option.details.length > 0 ? (
                <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                  {option.details.map((detail) => (
                    <span className="break-words" key={detail}>{detail}</span>
                  ))}
                </span>
              ) : (
                <span className="block break-words text-xs text-muted">{option.value}</span>
              )}
              {option.disabledReason ? <span className="block text-xs text-muted">{option.disabledReason}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CheckboxList({
  fieldName,
  onChange,
  onPrimaryChange,
  options,
  primaryLabel,
  primaryValue,
  readonly,
  value,
}: {
  fieldName: string;
  onChange: (value: FormValue) => void;
  onPrimaryChange?: (value: string) => void;
  options: Option[];
  primaryLabel?: string;
  primaryValue?: string;
  readonly?: boolean;
  value: string[];
}) {
  const [search, setSearch] = useState("");
  const [taxonomyFilter, setTaxonomyFilter] = useState<Record<TaxonomyKey, string>>({ module: "", resource: "", action: "", scope: "" });
  const selected = useMemo(() => new Set(value), [value]);
  const taxonomyChoices = useMemo(() => {
    const choices: Record<TaxonomyKey, string[]> = { module: [], resource: [], action: [], scope: [] };
    TAXONOMY_FILTERS.forEach(({ key }) => {
      choices[key] = Array.from(new Set(options.map((option) => option.taxonomy?.[key]).filter((item): item is string => Boolean(item))))
        .sort((a, b) => (formatPermissionTaxonomyValue(key, a) ?? a).localeCompare(formatPermissionTaxonomyValue(key, b) ?? b, "vi"));
    });
    return choices;
  }, [options]);
  const hasTaxonomy = TAXONOMY_FILTERS.some(({ key }) => taxonomyChoices[key].length > 0);
  const filteredOptions = useMemo(() => {
    const keyword = normalizeSearchText(search.trim());
    return options.filter((option) => {
      if (TAXONOMY_FILTERS.some(({ key }) => taxonomyFilter[key] && option.taxonomy?.[key] !== taxonomyFilter[key])) return false;
      return !keyword || normalizeSearchText(`${option.label} ${option.value} ${option.group ?? ""}`).includes(keyword);
    });
  }, [options, search, taxonomyFilter]);
  const filterActive = Boolean(search.trim()) || TAXONOMY_FILTERS.some(({ key }) => taxonomyFilter[key]);
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
    <div className="rounded-[8px] border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border p-2 sm:flex-row sm:items-center sm:justify-between">
        <Input className="h-10" disabled={readonly} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã hoặc tên" value={search} />
        <span className="shrink-0 rounded-[8px] bg-primary/8 px-2.5 py-1.5 text-xs font-semibold text-primary">{selected.size} đã chọn</span>
      </div>
      {hasTaxonomy ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
          {TAXONOMY_FILTERS.filter(({ key }) => taxonomyChoices[key].length > 0).map(({ key, label, all }) => (
            <select
              aria-label={label}
              className="h-9 min-w-0 flex-1 basis-40 rounded-lg border border-input bg-white px-2 text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-70"
              disabled={readonly}
              key={key}
              onChange={(event) => setTaxonomyFilter((current) => ({ ...current, [key]: event.target.value }))}
              value={taxonomyFilter[key]}
            >
              <option value="">{all}</option>
              {taxonomyChoices[key].map((code) => (
                <option key={code} value={code}>
                  {formatPermissionTaxonomyValue(key, code)}
                </option>
              ))}
            </select>
          ))}
          <span className="text-xs text-muted">Hiển thị {filteredOptions.length}/{options.length} quyền</span>
          {filterActive ? (
            <button
              className="text-xs font-semibold text-primary"
              onClick={() => {
                setSearch("");
                setTaxonomyFilter({ module: "", resource: "", action: "", scope: "" });
              }}
              type="button"
            >
              Xóa bộ lọc
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="max-h-[280px] overflow-y-auto p-2">
        {groups.length === 0 ? <p className="py-4 text-center text-sm text-muted">Không có dữ liệu phù hợp</p> : null}
        {groups.map(([group, groupOptions]) => {
          const enabledOptions = groupOptions.filter((option) => !option.disabled);
          const allChecked = enabledOptions.length > 0 && enabledOptions.every((option) => selected.has(option.value));
          return (
            <section className="mb-3 last:mb-0" key={group}>
              <div className="mb-1.5 flex flex-col gap-1.5 rounded-[8px] bg-surface-1 px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="grid gap-1.5 lg:grid-cols-2">
                {groupOptions.map((option) => (
                  <div
                    className={cn(
                      "flex min-h-11 items-start gap-2.5 rounded-[8px] border px-2.5 py-1.5 text-xs transition-colors",
                      selected.has(option.value) ? "border-primary bg-primary/8 text-primary" : "border-border bg-white text-foreground",
                      (readonly || option.disabled) && "cursor-not-allowed opacity-60",
                    )}
                    key={option.value}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
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
                    {onPrimaryChange ? (
                      <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted">
                        <input
                          checked={primaryValue === option.value}
                          className="h-4 w-4 accent-primary"
                          disabled={readonly || option.disabled || !selected.has(option.value)}
                          name={`${fieldName}-primary`}
                          onChange={() => onPrimaryChange(option.value)}
                          type="radio"
                        />
                        {primaryLabel ?? "Chính"}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

type TaxonomyKey = "module" | "resource" | "action" | "scope";

const TAXONOMY_FILTERS: Array<{ key: TaxonomyKey; label: string; all: string }> = [
  { key: "module", label: "Lọc theo phân hệ", all: "Tất cả phân hệ" },
  { key: "resource", label: "Lọc theo đối tượng", all: "Tất cả đối tượng" },
  { key: "action", label: "Lọc theo thao tác", all: "Tất cả thao tác" },
  { key: "scope", label: "Lọc theo phạm vi", all: "Tất cả phạm vi" },
];

function numericValue(value: string) {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function optionEndpointWithPaging(endpoint: string | undefined, searchParam?: string, searchValue?: string) {
  if (!endpoint) return "";
  const separator = endpoint.includes("?") ? "&" : "?";
  const search = searchParam && searchValue?.trim() ? `&${encodeURIComponent(searchParam)}=${encodeURIComponent(searchValue.trim())}` : "";
  return `${endpoint}${separator}page=0&size=100${search}`;
}

// Chuyển ISO-8601 có múi giờ từ BE sang giá trị của input datetime-local (giờ Việt Nam, UTC+7).
function toDatetimeLocalValue(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value.slice(0, 16);
  return new Date(time + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function useDynamicHelper(field: FormFieldSpec, values?: Record<string, unknown>) {
  const endpoint = field.dynamicHelper?.buildEndpoint(values ?? {});
  const query = useQuery({
    queryKey: ["field-helper", field.name, endpoint],
    enabled: Boolean(endpoint),
    queryFn: () => apiFetch<unknown>(String(endpoint)),
  });
  if (!field.dynamicHelper || !endpoint || query.data === undefined) return undefined;
  return field.dynamicHelper.format(query.data, values ?? {});
}

// Bỏ dấu + hạ chữ thường để tìm kiếm tiếng Việt không phân biệt dấu.
function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

function SearchableMultiSelect({
  id,
  onChange,
  options,
  placeholder,
  readonly,
  value,
}: {
  id: string;
  onChange: (value: FormValue) => void;
  options: Option[];
  placeholder?: string;
  readonly?: boolean;
  value: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => new Set(value), [value]);

  // Chỉ đóng dropdown khi bấm ra ngoài; bấm vào checkbox/nhãn bên trong không được làm mất focus và đóng danh sách.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    const keyword = normalizeSearchText(search.trim());
    if (!keyword) return options;
    return options.filter((option) => normalizeSearchText(`${option.label} ${option.value} ${option.group ?? ""}`).includes(keyword));
  }, [options, search]);
  const selectedOptions = options.filter((option) => selected.has(option.value));
  const allFilteredSelected = filteredOptions.length > 0 && filteredOptions.every((option) => selected.has(option.value) || option.disabled);

  function toggle(optionValue: string) {
    onChange(selected.has(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue]);
  }

  function toggleAllFiltered() {
    const filteredValues = filteredOptions.filter((option) => !option.disabled).map((option) => option.value);
    if (allFilteredSelected) onChange(value.filter((item) => !filteredValues.includes(item)));
    else onChange(Array.from(new Set([...value, ...filteredValues])));
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-[8px] border border-border bg-white px-2.5 py-1.5 text-left text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:bg-surface-1 disabled:opacity-70"
        disabled={readonly}
        id={id}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {selectedOptions.length === 0 ? <span className="text-muted">{placeholder ?? "Chọn người nhận"}</span> : null}
        {selectedOptions.map((option) => (
          <span className="inline-flex items-center gap-1 rounded-[6px] border border-primary/25 bg-primary/8 px-2 py-0.5 text-xs font-semibold text-primary" key={option.value}>
            {option.label}
            <span
              aria-label={`Bỏ chọn ${option.label}`}
              className="cursor-pointer px-0.5 hover:text-danger"
              onClick={(event) => {
                event.stopPropagation();
                if (!readonly) toggle(option.value);
              }}
              role="button"
            >
              ×
            </span>
          </span>
        ))}
      </button>
      {open && !readonly ? (
        <div className="absolute z-30 mt-1 w-full rounded-[8px] border border-border bg-white p-2 shadow-lg">
          <Input autoFocus className="h-9" onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc tài khoản" value={search} />
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Đã chọn {selectedOptions.length}/{options.length}</span>
            {filteredOptions.length > 0 ? (
              <button className="font-semibold text-primary hover:underline" onClick={toggleAllFiltered} type="button">
                {allFilteredSelected ? "Bỏ chọn kết quả" : "Chọn tất cả kết quả"}
              </button>
            ) : null}
          </div>
          <div className="mt-1 max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? <p className="px-3 py-2 text-sm text-muted">Không có dữ liệu phù hợp</p> : null}
            {filteredOptions.map((option) => (
              <label
                className={cn("flex cursor-pointer items-start gap-2 rounded-[6px] px-2 py-1.5 text-sm hover:bg-primary/8", option.disabled && "cursor-not-allowed opacity-60 hover:bg-transparent")}
                key={option.value}
              >
                <input checked={selected.has(option.value)} className="mt-0.5 h-4 w-4 accent-primary" disabled={option.disabled} onChange={() => toggle(option.value)} type="checkbox" />
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  {/*{option.label !== option.value ? <span className="block text-xs text-muted">{option.value}</span> : null}*/}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
