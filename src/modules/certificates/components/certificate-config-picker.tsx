"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { SCOPE_LABELS, type AssignmentResponse, type ConfigResponse } from "./certificate-design";

// Giá trị ô chọn khi loại khóa dùng cấu hình chung (không gán riêng).
const USE_DEFAULT = "";

// Chọn cấu hình chứng nhận từ thư viện cho một loại khóa (nhúng trong form loại khóa).
// Chế độ tạo mới (có onPendingChange): loại khóa chưa có mã nên chỉ ghi nhớ lựa chọn, form cha sẽ gán sau khi tạo xong.
export function CertificateConfigPicker({
  courseTypeCode,
  courseTypeName,
  pendingValue,
  onPendingChange,
}: {
  courseTypeCode: string;
  courseTypeName?: string;
  pendingValue?: string;
  onPendingChange?: (configId: string) => void;
}) {
  const deferred = Boolean(onPendingChange);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const canAssign = hasPermissionPrefix(user, "training.certificate_config.update.");

  const configsQuery = useQuery({
    queryKey: ["certificate-config", "options"],
    enabled: Boolean(user),
    queryFn: () => apiFetch<ConfigResponse[]>("/certificates/config/options"),
  });
  const assignmentsQuery = useQuery({
    queryKey: ["certificate-config", "assignments"],
    enabled: Boolean(user) && !deferred,
    queryFn: () => apiFetch<AssignmentResponse[]>("/certificates/config/assignments"),
  });

  const configs = configsQuery.data ?? [];
  const defaultConfig = configs.find((config) => config.isDefault && config.editable) ?? configs.find((config) => config.isDefault);
  // Cấu hình chung đã có mục "Dùng cấu hình chung" nên không liệt kê lại; chọn nó tương đương dùng cấu hình chung.
  const normalize = (id: string) => (defaultConfig && id === defaultConfig.id ? USE_DEFAULT : id);
  const assignedId = normalize(assignmentsQuery.data?.find((item) => item.courseTypeCode === courseTypeCode)?.configId ?? USE_DEFAULT);
  const [choice, setChoice] = useState<string | null>(null);
  const value = deferred ? normalize(pendingValue ?? USE_DEFAULT) : (choice ?? assignedId);
  const dirty = value !== assignedId;
  const effective = value === USE_DEFAULT ? defaultConfig : configs.find((config) => config.id === value);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiMutation("/certificates/config/assignments", "PUT", {
        courseTypeCode,
        configId: value === USE_DEFAULT ? null : value,
      }),
    onSuccess: async () => {
      toast.success("Đã cập nhật cấu hình chứng nhận cho loại khóa");
      await queryClient.invalidateQueries({ queryKey: ["certificate-config"] });
      // Đổi mẫu của loại khóa làm đổi bản xem trước mọi chứng nhận của loại khóa đó.
      await queryClient.invalidateQueries({ queryKey: ["certificate-preview"] });
      setChoice(null);
    },
  });

  const others = effective?.usedByCourseTypes.filter((type) => type.typeCode !== courseTypeCode) ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Chọn cấu hình chứng nhận từ thư viện cho loại khóa{" "}
        <span className="font-semibold text-foreground">{courseTypeName || courseTypeCode}</span>. Mỗi loại khóa chỉ dùng một cấu hình; một cấu hình có thể dùng cho nhiều loại khóa.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px]">
          <label className="mb-1 block text-xs font-medium text-muted">Cấu hình chứng nhận</label>
          <select
            className="h-11 w-full rounded-[8px] border border-border bg-white px-3 text-sm"
            disabled={!canAssign || configsQuery.isLoading}
            onChange={(event) => (deferred ? onPendingChange?.(event.target.value) : setChoice(event.target.value))}
            value={value}
          >
            <option value={USE_DEFAULT}>{defaultConfig ? `Cấu hình chung: ${defaultConfig.name}` : "Dùng cấu hình chung"}</option>
            {configs.filter((config) => config.id !== defaultConfig?.id).map((config) => (
              <option key={config.id} value={config.id}>
                {config.name}
                {!config.editable ? ` · ${SCOPE_LABELS[config.scopeLevel]}` : ""}
              </option>
            ))}
          </select>
        </div>
        {canAssign && !deferred ? (
          <Button disabled={!dirty} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
            Áp dụng
          </Button>
        ) : null}
        {!deferred ? (
          <Button asChild variant="outline">
            <Link href="/certificates/config">Mở thư viện cấu hình</Link>
          </Button>
        ) : null}
      </div>

      {configsQuery.isError ? <p className="text-sm text-danger">{getApiErrorMessage(configsQuery.error)}</p> : null}
      {!configsQuery.isLoading && configs.length === 0 ? (
        <p className="text-sm text-muted">Thư viện chưa có cấu hình nào. Hãy tạo cấu hình trong thư viện trước.</p>
      ) : null}

      {effective ? (
        <p className="text-xs text-muted">
          {others.length > 0
            ? `Cấu hình này còn được ${others.length} loại khóa khác dùng: ${others.map((type) => type.typeName || type.typeCode).join(", ")}.`
            : "Hiện chưa có loại khóa nào khác dùng cấu hình này."}
        </p>
      ) : null}
      {!canAssign ? <p className="text-xs text-muted">Bạn chỉ có quyền xem cấu hình chứng nhận.</p> : null}
    </div>
  );
}
