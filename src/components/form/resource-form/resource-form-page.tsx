"use client";

import { ArrowLeft, FloppyDisk, X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { RouteConfig } from "@/config/routes/routes";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { resolveRouteForUser } from "@/modules/workspace/super-admin-route-overrides";
import { FormField } from "./form-controls";
import { getLeaderCreateStepFields, LeaderCreateFormLayout, leaderCreateStepCount } from "./leader-create-form-layout";
import { getFormSpec } from "./registry";
import type { FormFieldSpec, ResourceFormMode } from "./types";

type FormValue = string | string[] | number | boolean | null | undefined;

export function ResourceFormPage({
  route,
  mode,
  id,
  actionType,
}: {
  route: RouteConfig;
  mode: ResourceFormMode;
  id?: string;
  actionType?: "create" | "edit" | "score" | "matrix";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const effectiveRoute = resolveRouteForUser(route, user);
  const effectiveAction = actionType ?? mode;
  const spec = getFormSpec(effectiveRoute, effectiveAction, user);
  const action = effectiveAction === "score" ? effectiveRoute.actions?.score : effectiveRoute.actions?.[mode];
  const canOpen = canUseAction(user, action);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [leaderCreateStep, setLeaderCreateStep] = useState(0);

  const detailQuery = useQuery({
    queryKey: ["resource-detail", effectiveRoute.endpoint, id],
    enabled: mode === "edit" && effectiveRoute.kind !== "accounts" && Boolean(effectiveRoute.endpoint && id),
    queryFn: () => apiFetch<Record<string, unknown>>(`${effectiveRoute.endpoint}/${encodeURIComponent(String(id))}`),
  });

  const initialValues = detailQuery.data ?? {};
  const createDefaults = mode === "create" ? spec?.getInitialValues?.(user) ?? {} : {};
  const mergedValues = mode === "edit" ? { ...initialValues, ...values } : { ...createDefaults, ...values };

  const visibleFields = (spec?.fields ?? [])
    .filter((field) => (mode === "create" ? !field.editOnly : !field.createOnly))
    .filter((field) => !(effectiveRoute.kind === "roles" && field.name === "roleCode"))
    .filter((field) => field.visibleWhen?.(mergedValues, mode) ?? true)
    .map((field) => ({
      ...field,
      optionsEndpoint: field.buildOptionsEndpoint?.(mergedValues) ?? field.optionsEndpoint,
      required: field.requiredWhen?.(mergedValues, mode) ?? field.required,
      readOnlyOnEdit: field.readOnlyOnEdit || (field.readOnlyWhen?.(mergedValues, mode) ?? false),
    }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!spec) throw new Error("Chưa có cấu hình form cho màn hình này");
      const nextErrors = validateFields(visibleFields, mergedValues);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) throw new Error("Vui lòng kiểm tra các trường bắt buộc");

      const submitValues = pickVisibleValues(visibleFields, mergedValues);
      const payload = spec.mapSubmit ? spec.mapSubmit(submitValues, mode) : submitValues;
      const path = spec.buildEndpoint
        ? spec.buildEndpoint({ ...submitValues, ...payload }, id)
        : mode === "create"
          ? effectiveRoute.endpoint
          : `${effectiveRoute.endpoint}/${encodeURIComponent(String(id))}`;
      if (!path) throw new Error("Route này chưa có endpoint để lưu");
      const method = spec.method ?? (mode === "create" ? "POST" : "PUT");
      return apiMutation<Record<string, unknown>>(path, method, payload);
    },
    onSuccess: async () => {
      toast.success(mode === "create" ? "Tạo mới thành công" : "Lưu cập nhật thành công");
      await queryClient.invalidateQueries({ queryKey: ["resource", effectiveRoute.endpoint] });
      router.push(effectiveRoute.path as Route);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  if (!spec) return <FormState title="Chưa hỗ trợ form" message="Màn hình này hiện không có mutation form trong contract backend." backHref={effectiveRoute.path} />;
  if (!canOpen) return <FormState title="403" message="Bạn không có quyền mở form này." backHref={effectiveRoute.path} />;
  if (detailQuery.isError) return <FormState title="Không thể tải dữ liệu" message={getApiErrorMessage(detailQuery.error)} backHref={effectiveRoute.path} />;
  if (mode === "edit" && effectiveRoute.kind === "accounts") {
    return <FormState title="Không thể chỉnh sửa" message="Màn hình quản trị tài khoản không hỗ trợ chỉnh sửa account." backHref={effectiveRoute.path} />;
  }

  const title = mode === "create" ? (spec.createTitle ?? effectiveRoute.primaryActionLabel ?? effectiveRoute.title) : (spec.editTitle ?? `Chỉnh sửa ${effectiveRoute.title.toLowerCase()}`);
  const sections = groupFields(visibleFields);
  const compactAccountForm = effectiveRoute.kind === "accounts";
  const horizontalSections = shouldUseHorizontalSections(effectiveRoute.kind, mode);
  const leaderCreateLayout = shouldUseLeaderCreateLayout(effectiveRoute.kind, mode);
  const leaderImageField = leaderCreateLayout ? visibleFields.find((field) => field.name === "imageUrl") : undefined;
  const leaderFormFields = leaderCreateLayout ? visibleFields.filter((field) => field.name !== "imageUrl") : visibleFields;
  const currentLeaderCreateFields = leaderCreateLayout ? getLeaderCreateStepFields(leaderFormFields, leaderCreateStep) : [];
  const leaderCreateCanContinue = leaderCreateLayout && leaderCreateStep < leaderCreateStepCount - 1;

  function handlePrimaryAction() {
    if (leaderCreateCanContinue) {
      const nextErrors = validateFields(currentLeaderCreateFields, mergedValues);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) {
        toast.error("Vui lòng kiểm tra các trường bắt buộc");
        return;
      }
      setLeaderCreateStep((step) => Math.min(step + 1, leaderCreateStepCount - 1));
      return;
    }
    mutation.mutate();
  }

  function handleFieldChange(field: FormFieldSpec, value: FormValue) {
    setValues((current) => nextValuesForField(current, field.name, value, mergedValues));
  }

  return (
    <div className={cn("mx-auto space-y-4 pb-20", leaderCreateLayout ? "max-w-[960px]" : horizontalSections ? "max-w-[1180px]" : "max-w-[860px]")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-primary" href={effectiveRoute.path as Route}>
            <ArrowLeft size={16} />
            Quay lại danh sách
          </Link>
          <h1 className="text-2xl font-semibold tracking-[0] text-foreground">{title}</h1>
          {leaderCreateLayout ? null : <p className="mt-1 max-w-[72ch] text-sm leading-5 text-muted">{spec.description ?? effectiveRoute.subtitle}</p>}
        </div>
      </div>

      {leaderCreateLayout ? (
        <LeaderCreateFormLayout
          currentStep={leaderCreateStep}
          errors={errors}
          fields={leaderFormFields}
          imageField={leaderImageField}
          mode={mode}
          onChange={handleFieldChange}
          onFieldChange={(fieldName, value) => setValues((current) => ({ ...current, [fieldName]: value }))}
          onStepSelect={setLeaderCreateStep}
          user={user}
          values={mergedValues}
        />
      ) : (
        <div className={horizontalSections ? sectionGridClass(sections.length) : "space-y-3"}>
          {detailQuery.isLoading ? (
            <Panel className="h-72 animate-pulse" />
          ) : (
            sections.map(([section, fields]) => (
              <Panel className={cn(compactAccountForm || horizontalSections ? "p-4 md:p-5" : "p-4", horizontalSections && "h-full")} key={section}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.04em] text-muted">{section}</h2>
                <div className={fieldGridClass(compactAccountForm, horizontalSections)}>
                  {fields.map((field) => (
                    <div className={fieldLayoutClass(field, horizontalSections)} key={field.name}>
                      <FormField
                        error={errors[field.name]}
                        field={field}
                        mode={mode}
                        onChange={(value) => handleFieldChange(field, value)}
                        onFieldChange={(fieldName, value) => setValues((current) => ({ ...current, [fieldName]: value }))}
                        user={user}
                        value={mergedValues[field.name] as FormValue}
                        values={mergedValues}
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            ))
          )}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-2.5 shadow-[var(--shadow-bottom-bar)] backdrop-blur">
        <div className={cn("mx-auto flex justify-end gap-3", leaderCreateLayout ? "max-w-[960px]" : "max-w-[1180px]")}>
          <Button asChild variant="outline">
            <Link href={effectiveRoute.path as Route}>{leaderCreateLayout ? "Hủy" : <><X size={16} />Hủy</>}</Link>
          </Button>
          <Button loading={mutation.isPending} onClick={handlePrimaryAction} type="button">
            {leaderCreateCanContinue ? null : <FloppyDisk size={16} />}
            {leaderCreateCanContinue ? "Tiếp tục" : spec.submitLabel ?? (mode === "create" ? "Tạo mới" : "Lưu cập nhật")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function nextValuesForField(current: Record<string, unknown>, fieldName: string, value: unknown, mergedValues: Record<string, unknown>) {
  if (fieldName !== "roleCodes") {
    return { ...current, [fieldName]: value };
  }
  const roleCodes = Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  const currentPrimary = String(current.primaryRoleCode ?? mergedValues.primaryRoleCode ?? "");
  const nextPrimary = currentPrimary && roleCodes.includes(currentPrimary) ? currentPrimary : roleCodes[0] ?? "";
  return { ...current, roleCodes, primaryRoleCode: nextPrimary };
}

function groupFields(fields: FormFieldSpec[]) {
  const groups = new Map<string, FormFieldSpec[]>();
  fields.forEach((field) => {
    const section = field.section ?? "Thông tin";
    groups.set(section, [...(groups.get(section) ?? []), field]);
  });
  return Array.from(groups.entries());
}

function shouldUseLeaderCreateLayout(kind: RouteConfig["kind"], mode: ResourceFormMode) {
  return mode === "create" && kind === "leaders";
}

function shouldUseHorizontalSections(kind: RouteConfig["kind"], mode: ResourceFormMode) {
  return mode === "edit" && ["leaders", "dioceses", "deaneries", "parishes"].includes(kind);
}

function sectionGridClass(sectionCount: number) {
  if (sectionCount >= 4) return "grid gap-4 lg:grid-cols-2 xl:grid-cols-4";
  if (sectionCount === 3) return "grid gap-4 lg:grid-cols-3";
  if (sectionCount === 2) return "grid gap-4 lg:grid-cols-2";
  return "space-y-3";
}

function fieldGridClass(compactAccountForm: boolean, horizontalSections: boolean) {
  if (horizontalSections) return "grid gap-3";
  if (compactAccountForm) return "grid gap-3 md:grid-cols-2";
  return "grid gap-3 md:grid-cols-2 xl:grid-cols-3";
}

function fieldLayoutClass(field: FormFieldSpec, horizontalSections = false) {
  if (horizontalSections) return undefined;
  if (field.type === "image") return "md:col-span-2 xl:col-span-3";
  if (field.type === "checkbox-list") return "md:col-span-2 xl:col-span-3";
  if (field.type === "textarea" || field.type === "multiselect") return "md:col-span-2";
  return undefined;
}

function validateFields(fields: FormFieldSpec[], values: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  fields.forEach((field) => {
    if (!field.required) return;
    const value = values[field.name];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      errors[field.name] = "Trường này là bắt buộc";
    }
  });
  return errors;
}

function pickVisibleValues(fields: FormFieldSpec[], values: Record<string, unknown>) {
  const visibleNames = new Set(fields.map((field) => field.name));
  fields.forEach((field) => {
    if (field.primaryFieldName) visibleNames.add(field.primaryFieldName);
  });
  return Object.fromEntries(Object.entries(values).filter(([key]) => visibleNames.has(key)));
}

function FormState({ title, message, backHref }: { title: string; message: string; backHref: string }) {
  return (
    <Panel className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <Button asChild className="mt-5" variant="outline">
        <Link href={backHref as Route}>Quay lại</Link>
      </Button>
    </Panel>
  );
}
