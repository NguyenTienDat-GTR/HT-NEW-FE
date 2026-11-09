"use client";

import { scoreComponentsError } from "./score-components-field";
import { ArrowLeft, FloppyDisk, X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Panel } from "@/components/ui/panel";
import type { RouteConfig } from "@/config/routes/routes";
import { ConsentCheckbox } from "@/components/common/consent-checkbox";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction, hasPermissionPrefix } from "@/lib/auth/permissions";
import { OffTargetConfirmDialog } from "@/modules/training-workflow/components/off-target-confirm-dialog";
import { CourseTypeRequirements } from "@/modules/training-courses/components/course-conditions";
import { CertificateConfigPicker } from "@/modules/certificates/components/certificate-config-picker";
import { cn } from "@/lib/utils";
import { resolveRouteForUser } from "@/modules/workspace/super-admin-route-overrides";
import { FormSections } from "./form-sections";
import { LeaderFormLayout } from "./leader-form-layout";
import { getFormSpec } from "./registry";
import type { FormFieldSpec, ResourceFormMode } from "./types";
import { invalidateDataQueries } from "@/lib/api/query-keys";

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
  // Hồ sơ gửi ngoài đợt: hỏi xác nhận kèm lí do riêng; sau khi lưu lí do vào form mới gửi (submitRequested chạy ở effect sau khi render lại).
  const [offTargetOpen, setOffTargetOpen] = useState(false);
  const [submitRequested, setSubmitRequested] = useState(false);
  // Xác nhận đồng ý của người có dữ liệu (chỉ form có spec.consentAttestation): luôn bắt đầu chưa tích.
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [consentError, setConsentError] = useState(false);
  // Cấu hình chứng nhận chọn khi tạo loại khóa; gán sau khi tạo xong (loại khóa chưa có mã lúc điền form).
  const [pendingCertConfigId, setPendingCertConfigId] = useState("");

  const detailQuery = useQuery({
    queryKey: ["resource-detail", effectiveRoute.endpoint, id],
    enabled: mode === "edit" && effectiveRoute.kind !== "accounts" && Boolean(effectiveRoute.endpoint && id),
    queryFn: () => apiFetch<Record<string, unknown>>(`${effectiveRoute.endpoint}/${encodeURIComponent(String(id))}`),
  });

  const initialValues = detailQuery.data ?? {};
  // Mở từ tab khóa huấn luyện: quay về đúng tab sau khi lưu và chọn sẵn khóa.
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const prefillCourseCode = searchParams.get("courseCode");
  const prefillCourseName = searchParams.get("courseName");
  const createDefaults: Record<string, unknown> =
    mode === "create"
      ? { ...(spec?.getInitialValues?.(user) ?? {}), ...(prefillCourseCode && spec?.fields.some((field) => field.name === "courseCode") ? { courseCode: prefillCourseCode } : {}) }
      : {};
  const baseValues = mode === "edit" ? { ...initialValues, ...values } : { ...createDefaults, ...values };
  // Cờ "khóa có cấp chứng nhận" suy từ cấp độ đạt được của loại khóa; đã có cấp độ thì không tắt lại được.
  const certificateLocked = mode === "edit" && effectiveRoute.kind === "course-types" && requiresCertification(initialValues);
  const mergedValues =
    effectiveRoute.kind === "course-types"
      ? { ...baseValues, certificateLocked, hasCertificate: baseValues.hasCertificate ?? requiresCertification(baseValues) }
      : baseValues;

  // Trường chỉ hiện khi có từ hai lựa chọn (tư cách gửi của tài khoản nhiều role): đếm số lựa chọn từ API.
  const singleOptionGate = spec?.fields.find((field) => field.hideWhenSingleOption && field.optionsEndpoint);
  const gateQuery = useQuery({
    queryKey: ["field-option-count", singleOptionGate?.optionsEndpoint],
    enabled: Boolean(singleOptionGate),
    queryFn: () => apiFetch<unknown[]>(singleOptionGate!.optionsEndpoint!),
  });
  const gateOptionCount = Array.isArray(gateQuery.data) ? gateQuery.data.length : 0;

  const visibleFields = (spec?.fields ?? [])
    .filter((field) => !field.hideWhenSingleOption || gateOptionCount > 1)
    .filter((field) => (mode === "create" ? !field.editOnly : !field.createOnly))
    .filter((field) => !(effectiveRoute.kind === "roles" && field.name === "roleCode"))
    .filter((field) => field.visibleWhen?.(mergedValues, mode, user) ?? true)
    .map((field) => ({
      ...field,
      optionsEndpoint: field.buildOptionsEndpoint?.(mergedValues) ?? field.optionsEndpointForUser?.(user) ?? field.optionsEndpoint,
      required: field.requiredWhen?.(mergedValues, mode) ?? field.required,
      readOnlyOnEdit: field.readOnlyOnEdit || (field.readOnlyWhen?.(mergedValues, mode) ?? false),
      // Khóa được chọn sẵn từ tab của khóa: hiện tên khóa (không phải mã) kể cả khi khóa không nằm trong danh sách lựa chọn.
      currentLabel: field.name === "courseCode" && prefillCourseName ? prefillCourseName : field.currentLabel,
    }));

  // Chỉ hiện khi bật cờ "khóa có cấp chứng nhận".
  const showCertPicker =
    effectiveRoute.kind === "course-types" &&
    mergedValues.hasCertificate === true &&
    hasPermissionPrefix(user, "training.certificate_config.read.");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!spec) throw new Error("Chưa có cấu hình form cho màn hình này");
      const nextErrors = validateFields(visibleFields, mergedValues);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) throw new Error("Vui lòng kiểm tra các trường bắt buộc");

      const submitValues = pickVisibleValues(visibleFields, mergedValues, spec.extraValueNames);
      const mapped = spec.mapSubmit ? spec.mapSubmit(submitValues, mode) : submitValues;
      const payload = spec.consentAttestation ? { ...mapped, subjectConsentConfirmed: true } : mapped;
      const path = spec.buildEndpoint
        ? spec.buildEndpoint({ ...submitValues, ...payload }, id)
        : mode === "create"
          ? effectiveRoute.endpoint
          : `${effectiveRoute.endpoint}/${encodeURIComponent(String(id))}`;
      if (!path) throw new Error("Route này chưa có endpoint để lưu");
      const method = spec.method ?? (mode === "create" ? "POST" : "PUT");
      const result = await apiMutation<Record<string, unknown>>(path, method, payload);
      if (effectiveRoute.kind === "course-types" && showCertPicker && !certificateLocked && pendingCertConfigId) {
        const typeCode = mode === "create" ? String(result?.typeCode ?? "") : String(id);
        if (typeCode) {
          try {
            await apiMutation("/certificates/config/assignments", "PUT", { courseTypeCode: typeCode, configId: pendingCertConfigId });
          } catch (error) {
            toast.error(`Đã tạo loại khóa nhưng chưa gán được cấu hình chứng nhận: ${getApiErrorMessage(error)}`);
          }
        }
      }
      return result;
    },
    onSuccess: async (result) => {
      toast.success(effectiveAction === "revoke" ? "Thu hồi quyền thành công" : mode === "create" ? "Tạo mới thành công" : "Lưu cập nhật thành công");
      // Khóa vừa lưu kèm sao chép danh sách tham dự: báo số hồ sơ đã sao chép và số hồ sơ bị bỏ qua.
      const copied = Number(result?.copiedParticipantCount);
      if (Number.isFinite(copied) && result?.copiedParticipantCount !== undefined && result?.copiedParticipantCount !== null) {
        const skipped = Number(result?.copySkippedCount ?? 0);
        toast.success(`Đã sao chép ${copied} hồ sơ vào danh sách tham dự${skipped > 0 ? `, bỏ qua ${skipped} hồ sơ không sao chép được` : ""}`);
      }
      // Tạo / sửa / đăng ký có thể đổi dữ liệu ở màn khác (chi tiết khóa, hồ sơ tham dự, chứng nhận): làm mới tất cả.
      await invalidateDataQueries(queryClient);
      router.push((returnTo ?? effectiveRoute.path) as Route);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
    onSettled: () => setSubmitRequested(false),
  });

  useEffect(() => {
    if (!submitRequested) return;
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitRequested]);

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
  const offTargetList = spec.offTarget?.collect(mergedValues) ?? [];

  function handleSubmit() {
    if (spec?.consentAttestation && !consentConfirmed) {
      setConsentError(true);
      return;
    }
    // Có hồ sơ ngoài đợt thì cảnh báo và bắt nhập lí do riêng trước khi gửi.
    if (offTargetList.length > 0) {
      setOffTargetOpen(true);
      return;
    }
    mutation.mutate();
  }

  function confirmOffTarget(reasons: Record<string, string>) {
    const patch = spec?.offTarget?.apply(mergedValues, reasons) ?? {};
    setValues((current) => ({ ...current, ...patch }));
    setOffTargetOpen(false);
    setSubmitRequested(true);
  }

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

      {effectiveRoute.kind === "courses" && typeof mergedValues.courseTypeCode === "string" && mergedValues.courseTypeCode ? (
        <CourseTypeRequirements courseTypeCode={mergedValues.courseTypeCode} />
      ) : null}

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

      {showCertPicker ? (
        <Panel className="space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold leading-5 text-foreground">
            <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
            Cấu hình chứng nhận
          </h2>
          {!certificateLocked ? (
            <CertificateConfigPicker courseTypeCode={mode === "edit" ? String(id) : ""} courseTypeName={String(mergedValues.typeName ?? "")} onPendingChange={setPendingCertConfigId} pendingValue={pendingCertConfigId} />
          ) : (
            <CertificateConfigPicker courseTypeCode={String(id)} courseTypeName={String(mergedValues.typeName ?? "")} />
          )}
        </Panel>
      ) : null}

      {spec.consentAttestation ? (
        <ConsentCheckbox
          checked={consentConfirmed}
          error={consentError && !consentConfirmed ? "Vui lòng xác nhận trước khi lưu" : null}
          onChange={(checked) => {
            setConsentConfirmed(checked);
            if (checked) setConsentError(false);
          }}
          variant="attestation"
        />
      ) : null}

      {offTargetOpen ? (
        <OffTargetConfirmDialog
          courseName={prefillCourseName ?? undefined}
          entries={offTargetList}
          onCancel={() => setOffTargetOpen(false)}
          onConfirm={confirmOffTarget}
        />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-2.5 shadow-[var(--shadow-bottom-bar)] backdrop-blur-md">
        <div className={cn("mx-auto flex justify-end gap-3", compactForm ? "max-w-[720px]" : "max-w-[1120px]")}>
          <Button asChild variant="outline">
            <Link href={backHref}>
              <X size={16} />
              Hủy
            </Link>
          </Button>
          <Button loading={mutation.isPending} onClick={handleSubmit} type="button">
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
  if (fieldName === "courseTypeCode") {
    // Đổi loại khóa có thể đổi cấp quản lý (phạm vi khóa nguồn) nên bỏ các khóa nguồn đã chọn.
    return { ...current, courseTypeCode: value, copySourceCourseCodes: [] };
  }
  if (fieldName === "senderType") {
    // Đổi tư cách gửi thì phạm vi huynh trưởng đổi theo: lập lại cả hai danh sách (khóa không còn hợp lệ sẽ tự bỏ chọn).
    return { ...current, senderType: value, leaderIds: [], exceptionLeaders: [] };
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
    if (field.type === "score-components") {
      const message = scoreComponentsError(raw);
      if (message) errors[field.name] = message;
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

function pickVisibleValues(fields: FormFieldSpec[], values: Record<string, unknown>, extraNames: string[] = []) {
  const visibleNames = new Set([...fields.map((field) => field.name), ...extraNames]);
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
