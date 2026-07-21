import type { PageResponse } from "@/lib/api/client";

export function asPageResponse(
  data: PageResponse<Record<string, unknown>> | Record<string, unknown>[] | undefined,
  size: number,
): PageResponse<Record<string, unknown>> | undefined {
  if (!data) return undefined;
  if (!Array.isArray(data)) return data;
  return {
    content: data,
    totalElements: data.length,
    totalPages: 1,
    size,
    number: 0,
    first: true,
    last: true,
  };
}
