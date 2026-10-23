"use client";

import { Panel } from "@/components/ui/panel";
import type { AuthUser } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";
import { FormField } from "./form-controls";
import type { FormFieldSpec, ResourceFormMode } from "./types";

type FormValue = string | string[] | number | boolean | null | undefined;

export type FormSectionPlan = {
  title: string;
  fields: FormFieldSpec[];
  // compact: nhóm ngắn, xếp cạnh nhóm khác (nửa chiều ngang); full: nhóm lớn chiếm trọn hàng.
  size: "compact" | "full";
};

const BULKY_TYPES = new Set(["image", "checkbox-list", "registration-list"]);
const COMPACT_MAX_FIELDS = 6;

export function groupFields(fields: FormFieldSpec[]) {
  const groups = new Map<string, FormFieldSpec[]>();
  fields.forEach((field) => {
    const section = field.section ?? "Thông tin";
    groups.set(section, [...(groups.get(section) ?? []), field]);
  });
  return Array.from(groups.entries());
}

// Nhóm có ít trường và không chứa điều khiển cồng kềnh thì thu gọn để hai nhóm nằm cạnh nhau, giảm cuộn trang.
export function planFormSections(fields: FormFieldSpec[]): FormSectionPlan[] {
  return groupFields(fields).map(([title, sectionFields]) => ({
    title,
    fields: sectionFields,
    size: sectionFields.length <= COMPACT_MAX_FIELDS && !sectionFields.some((field) => field.wide || BULKY_TYPES.has(field.type ?? "text")) ? "compact" : "full",
  }));
}

// Nhóm compact lẻ cuối cùng (không có cặp) kéo giãn hết hàng để không để trống nửa trang.
export function sectionSpans(plans: FormSectionPlan[]) {
  const compactCount = plans.filter((plan) => plan.size === "compact").length;
  let seenCompact = 0;
  return plans.map((plan) => {
    if (plan.size === "full") return "full" as const;
    seenCompact += 1;
    return compactCount % 2 === 1 && seenCompact === compactCount ? ("full" as const) : ("half" as const);
  });
}

export function FormSections({
  fields,
  values,
  errors,
  mode,
  user,
  onChange,
  onFieldChange,
}: {
  fields: FormFieldSpec[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  mode: ResourceFormMode;
  user: AuthUser | null;
  onChange: (field: FormFieldSpec, value: FormValue) => void;
  onFieldChange: (fieldName: string, value: FormValue) => void;
}) {
  const plans = planFormSections(fields);
  const spans = sectionSpans(plans);

  return (
    <div className="grid grid-flow-row-dense gap-4 lg:grid-cols-2">
      {plans.map((plan, index) => {
        const span = spans[index];
        return (
          <Panel className={cn("p-4", span === "full" && "lg:col-span-2")} key={plan.title}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold leading-5 text-foreground">
              <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
              {plan.title}
            </h2>
            <div className={cn("grid gap-x-4 gap-y-3 sm:grid-cols-2", span === "full" && plan.size === "full" && "xl:grid-cols-3")}>
              {plan.fields.map((field) => (
                <div className={fieldSpanClass(field, span === "full" && plan.size === "full")} key={field.name}>
                  <FormField
                    error={errors[field.name]}
                    field={field}
                    mode={mode}
                    onChange={(value) => onChange(field, value)}
                    onFieldChange={onFieldChange}
                    user={user}
                    value={values[field.name] as FormValue}
                    values={values}
                  />
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function fieldSpanClass(field: FormFieldSpec, threeColumns: boolean) {
  const type = field.type ?? "text";
  if (field.wide) return threeColumns ? "sm:col-span-2 xl:col-span-3" : "sm:col-span-2";
  if (BULKY_TYPES.has(type)) return threeColumns ? "sm:col-span-2 xl:col-span-3" : "sm:col-span-2";
  if (type === "textarea" || type === "multiselect" || type === "switch") return threeColumns ? "sm:col-span-2 xl:col-span-3" : "sm:col-span-2";
  return undefined;
}
