"use client";

import { ArrowLeft, FloppyDisk, X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Panel } from "@/components/ui/panel";
import type { RouteConfig } from "@/config/routes/routes";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction, hasPermissionPrefix } from "@/lib/auth/permissions";
import { CertificateConfigPicker } from "@/modules/certificates/components/certificate-config-picker";
import { cn } from "@/lib/utils";
import { resolveRouteForUser } from "@/modules/workspace/super-admin-route-overrides";
import { FormSections } from "./form-sections";
import { LeaderFormLayout } from "./leader-form-layout";
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
  actionType?: "create" | "edit" | "score" | "matrix" | "revoke";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const effectiveRoute = resolveRouteForUser(route, user);
  const effectiveAction = actionType ?? mode;
  const spec = getFormSpec(effectiveRoute, effectiveAction, user);
  const action = effectiveAction === "score" ? effectiveRoute.actions?.score : effectiveAction === "revoke" ? effectiveRoute.actions?.revoke : effectiveRoute.actions?.[mode];
  const canOpen = canUseAction(user, action);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detailQuery = useQuery({
    queryKey: ["resource-detail", effectiveRoute.endpoint, id],
    enabled: mode === "edit" && effectiveRoute.kind !== "accounts" && Boolean(effectiveRoute.endpoint && id),
    queryFn: () => apiFetch<Record<string, unknown>>(`${effectiveRoute.endpoint}/${encodeURIComponent(String(id))}`),
  });

  const initialValues = detailQuery.data ?? {};
  // Mở từ tab khóa huấn luyện: quay về đúng tab sau khi lưu và chọn sẵn khóa.
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const prefillCourseCode = searchParams.get("courseCode");
  const createDefaults: Record<string, unknown> =
    mode === "create"
      ? { ...(spec?.getInitialValues?.(user) ?? {}), ...(prefillCourseCode && spec?.fields.some((field) => field.name === "courseCode") ? { courseCode: prefillCourseCode } : {}) }
      : {};
  const mergedValues = mode === "edit" ? { ...initialValues, ...values } : { ...createDefaults, ...values };

  const visibleFields = (spec?.fields ?? [])
    .filter((field) => (mode === "create" ? !field.editOnly : !field.createOnly))
    .filter((field) => !(effectiveRoute.kind === "roles" && field.name === "roleCode"))
    .filter((field) => field.visibleWhen?.(mergedValues, mode) ?? true)
    .map((field) => ({
      ...field,
      optionsEndpoint: field.buildOptionsEndpoint?.(mergedValues) ?? field.optionsEndpointForUser?.(user) ?? field.optionsEndpoint,
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
      toast.success(effectiveAction === "revoke" ? "Thu hồi quyền thành công" : mode === "create" ? "Tạo mới thành công" : "Lưu cập nhật thành công");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["resource", effectiveRoute.endpoint] }),
        queryClient.invalidateQueries({ queryKey: ["resource-detail", effectiveRoute.endpoint] }),
      ]);
      router.push((returnTo ?? effectiveRoute.path) as Route);
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
  const leaderLayout = effectiveRoute.kind === "leaders";
  const leaderImageField = leaderLayout ? visibleFields.find((field) => field.name === "imageUrl") : undefined;
  const sectionFields = leaderLayout ? visibleFields.filter((field) => field.name !== "imageUrl") : visibleFields;
  const compactForm = visibleFields.length <= 4 && !leaderLayout;

  function handleFieldChange(field: FormFieldSpec, value: FormValue) {
    setValues((current) => nextValuesForField(current, field.name, value, mergedValues));
  }

  function handleOtherFieldChange(fieldName: string, value: FormValue) {
    setValues((current) => ({ ...current, [fieldName]: value }));
  }

  const backHref = (returnTo ?? effectiveRoute.path) as Route;

  return (
    <div className={cn("mx-auto space-y-4 pb-20", compactForm ? "max-w-[720px]" : "max-w-[1120px]")}>
      <div>
        <Link className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary" href={backHref}>
          <ArrowLeft size={14} />
          Quay lại danh sách
        </Link>
        <div className="flex flex-wrap items-center gap-x-2">
          <h1 className="text-xl font-bold leading-7 tracking-[0] text-foreground">{title}</h1>
          {spec.description ?? effectiveRoute.subtitle ? (
            <HelpTip label="Mô tả màn hình">{spec.description ?? effectiveRoute.subtitle}</HelpTip>
          ) : null}
        </div>
      </div>

      {detailQuery.isLoading ? (
        <Panel className="h-60 animate-pulse" />
      ) : leaderLayout ? (
        <LeaderFormLayout
          errors={errors}
          fields={sectionFields}
          imageField={leaderImageField}
          mode={mode}
          onChange={handleFieldChange}
          onFieldChange={handleOtherFieldChange}
          user={user}
          values={mergedValues}
        />
      ) : (
        <FormSections errors={errors} fields={sectionFields} mode={mode} onChange={handleFieldChange} onFieldChange={handleOtherFieldChange} user={user} values={mergedValues} />
      )}

      {mode === "edit" &&
      effectiveRoute.kind === "course-types" &&
      requiresCertification(mergedValues) &&
      hasPermissionPrefix(user, "training.certificate_config.read.") ? (
        <Panel className="space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold leading-5 text-foreground">
            <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
            Cấu hình chứng nhận
          </h2>
          <CertificateConfigPicker courseTypeCode={String(id)} courseTypeName={String(mergedValues.typeName ?? "")} />
        </Panel>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-2.5 shadow-[var(--shadow-bottom-bar)] backdrop-blur-md">
        <div className={cn("mx-auto flex justify-end gap-3", compactForm ? "max-w-[720px]" : "max-w-[1120px]")}>
          <Button asChild variant="outline">
            <Link href={backHref}>
              <X size={16} />
              Hủy
            </Link>
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()} type="button">
            <FloppyDisk size={16} />
            {spec.submitLabel ?? (mode === "create" ? "Tạo mới" : "Lưu cập nhật")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Chỉ chấp nhận đường dẫn nội bộ làm điểm quay về.
function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

function nextValuesForField(current: Record<string, unknown>, fieldName: string, value: unknown, mergedValues: Record<string, unknown>) {
  if (fieldName === "courseCode") {
    // Đổi khóa thì điều kiện tham dự đổi theo, phải lập lại cả hai danh sách.
    return { ...current, courseCode: value, leaderIds: [], exceptionLeaders: [] };
  }
  if (fieldName !== "roleCodes") {
    return { ...current, [fieldName]: value };
  }
  const roleCodes = Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  const currentPrimary = String(current.primaryRoleCode ?? mergedValues.primaryRoleCode ?? "");
  const nextPrimary = currentPrimary && roleCodes.includes(currentPrimary) ? currentPrimary : roleCodes[0] ?? "";
  return { ...current, roleCodes, primaryRoleCode: nextPrimary };
}

// Loại khóa có yêu cầu chứng nhận khi có cấp độ đạt được (resultingLevel khác rỗng/NONE).
function requiresCertification(values: Record<string, unknown>) {
  const level = values.resultingLevel;
  return typeof level === "string" && level !== "" && level !== "NONE";
}

function validateFields(fields: FormFieldSpec[], values: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  fields.forEach((field) => {
    const raw = values[field.name];
    if (field.min !== undefined && raw !== undefined && raw !== null && raw !== "" && Number(raw) < field.min) {
      errors[field.name] = `Giá trị không được nhỏ hơn ${field.min}`;
      return;
    }
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
