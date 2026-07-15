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
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/features/workspace/routes";
import { resolveRouteForUser } from "@/features/workspace/super-admin-route-overrides";
import { getFormSpec } from "./registry";
import { FormField } from "./form-controls";
import type { FormFieldSpec, ResourceFormMode } from "./types";

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

  const detailQuery = useQuery({
    queryKey: ["resource-detail", effectiveRoute.endpoint, id],
    enabled: mode === "edit" && Boolean(effectiveRoute.endpoint && id),
    queryFn: () => apiFetch<Record<string, unknown>>(`${effectiveRoute.endpoint}/${encodeURIComponent(String(id))}`),
  });

  const [values, setValues] = useState<Record<string, unknown>>({});
  const initialValues = detailQuery.data ?? {};
  const createDefaults = mode === "create" ? spec?.getInitialValues?.(user) ?? {} : {};
  const mergedValues = mode === "edit" ? { ...initialValues, ...values } : { ...createDefaults, ...values };

  const visibleFields = (spec?.fields ?? [])
    .filter((field) => (mode === "create" ? !field.editOnly : !field.createOnly))
    .filter((field) => field.visibleWhen?.(mergedValues, mode) ?? true)
    .map((field) => ({ ...field, required: field.requiredWhen?.(mergedValues, mode) ?? field.required }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      if (!spec) throw new Error("Chưa có cấu hình form cho màn hình này");
      const nextErrors = validateFields(visibleFields, mergedValues);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) throw new Error("Vui lòng kiểm tra các trường bắt buộc");

      const payload = spec.mapSubmit ? spec.mapSubmit(mergedValues, mode) : mergedValues;
      const path = spec.buildEndpoint
        ? spec.buildEndpoint({ ...mergedValues, ...payload }, id)
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

  const title = mode === "create" ? (spec.createTitle ?? effectiveRoute.primaryActionLabel ?? effectiveRoute.title) : (spec.editTitle ?? `Chỉnh sửa ${effectiveRoute.title.toLowerCase()}`);
  const sections = groupFields(visibleFields);

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary" href={effectiveRoute.path as Route}>
            <ArrowLeft size={16} />
            Quay lại danh sách
          </Link>
          <h1 className="text-3xl font-semibold tracking-[0] text-foreground">{title}</h1>
          <p className="mt-2 max-w-[78ch] text-sm leading-6 text-muted">{spec.description ?? effectiveRoute.subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        {detailQuery.isLoading ? (
          <Panel className="h-72 animate-pulse" />
        ) : (
          sections.map(([section, fields]) => (
            <Panel className="p-5" key={section}>
              <h2 className="mb-4 text-lg font-semibold text-foreground">{section}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.map((field) => (
                  <div className={field.type === "textarea" || field.type === "multiselect" || field.type === "checkbox-list" || field.type === "radio" ? "md:col-span-2" : undefined} key={field.name}>
                    <FormField
                      error={errors[field.name]}
                      field={field}
                      mode={mode}
                      onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
                      value={mergedValues[field.name] as string | string[] | number | boolean | null | undefined}
                    />
                  </div>
                ))}
              </div>
            </Panel>
          ))
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] justify-end gap-3">
          <Button asChild variant="outline">
            <Link href={effectiveRoute.path as Route}>
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

function groupFields(fields: FormFieldSpec[]) {
  const groups = new Map<string, FormFieldSpec[]>();
  fields.forEach((field) => {
    const section = field.section ?? "Thông tin";
    groups.set(section, [...(groups.get(section) ?? []), field]);
  });
  return Array.from(groups.entries());
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
