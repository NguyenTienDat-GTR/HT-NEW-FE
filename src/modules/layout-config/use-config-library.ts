import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch, apiMutation, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";

/** Giá trị đặc biệt của "cấu hình đang mở": đang soạn một cấu hình mới chưa lưu. */
export const NEW_CONFIG = "__new__";

type ConfigLike = { id: string; isDefault?: boolean; editable?: boolean };

/**
 * Cấu hình đang mở: người dùng chọn; chưa chọn hoặc cấu hình đã bị xóa thì rơi về cấu hình chung
 * (ưu tiên bản sửa được), rồi tới cấu hình đầu tiên, cuối cùng là soạn mới. Chưa tải xong danh sách thì null.
 */
export function resolveConfigId<T extends ConfigLike>(configs: T[] | undefined, selectedId: string | null): string | null {
  if (!configs) return null;
  if (selectedId === NEW_CONFIG) return NEW_CONFIG;
  if (selectedId && configs.some((config) => config.id === selectedId)) return selectedId;
  const defaultConfig = configs.find((config) => config.isDefault && config.editable) ?? configs.find((config) => config.isDefault) ?? null;
  return defaultConfig?.id ?? configs[0]?.id ?? NEW_CONFIG;
}

/** Các lời gọi API của một thư viện cấu hình (chứng nhận, thẻ tham dự...) dưới cùng một đường dẫn gốc. */
export function configLibraryApi<T, F>(basePath: string) {
  return {
    options: () => apiFetch<T[]>(`${basePath}/options`),
    fields: () => apiFetch<F[]>(`${basePath}/fields`),
    list: (params: string | URLSearchParams) => apiFetch<PageResponse<T>>(`${basePath}?${params}`),
    detail: (id: string) => apiFetch<T>(`${basePath}/${id}`),
    create: (body: unknown) => apiMutation<T>(basePath, "POST", body),
    update: (id: string, body: unknown) => apiMutation<T>(`${basePath}/${id}`, "PUT", body),
    setDefault: (id: string) => apiMutation<T>(`${basePath}/${id}/default`, "PUT"),
    remove: (id: string) => apiMutation<void>(`${basePath}/${id}`, "DELETE"),
  };
}

type Options = {
  basePath: string;
  /** Gốc khóa React Query của thư viện, vd. "badge-config". */
  queryRoot: string;
  selectedId: string | null;
  libraryParams: string | URLSearchParams;
  fieldsStaleTime?: number;
};

/** Dữ liệu dùng chung của màn thư viện + trình thiết kế cấu hình: tùy chọn gọn, danh mục trường, danh sách phân trang và chi tiết. */
export function useConfigLibrary<T extends ConfigLike, F>({ basePath, queryRoot, selectedId, libraryParams, fieldsStaleTime }: Options) {
  const user = useAuthStore((state) => state.user);
  const api = configLibraryApi<T, F>(basePath);

  const optionsQuery = useQuery({ queryKey: [queryRoot, "options"], enabled: Boolean(user), queryFn: api.options });
  const fieldsQuery = useQuery({ queryKey: [queryRoot, "fields"], enabled: Boolean(user), staleTime: fieldsStaleTime, queryFn: api.fields });
  const libraryQuery = useQuery({
    queryKey: [queryRoot, "list", libraryParams],
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    queryFn: () => api.list(libraryParams),
  });

  const configs = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data]);
  const resolvedId = resolveConfigId(optionsQuery.data, selectedId);
  const isNew = resolvedId === NEW_CONFIG;

  const detailQuery = useQuery({
    queryKey: [queryRoot, "detail", resolvedId],
    enabled: Boolean(user) && Boolean(resolvedId) && !isNew,
    queryFn: () => api.detail(String(resolvedId)),
  });
  const selectedConfig = !isNew && detailQuery.data?.id === resolvedId ? detailQuery.data : null;

  return { api, optionsQuery, fieldsQuery, libraryQuery, detailQuery, configs, resolvedId, isNew, selectedConfig };
}
