"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { QuickSearchGroup } from "../types";

export const QUICK_SEARCH_MIN_LENGTH = 2;

// Debounce chung của mọi ô tìm kiếm (400ms) để không vượt rate limit đọc; chỉ gọi khi đủ ký tự.
export function useQuickSearch(rawTerm: string, enabled = true) {
  const term = useDebouncedValue(rawTerm.trim());
  const active = enabled && term.length >= QUICK_SEARCH_MIN_LENGTH;
  const query = useQuery({
    queryKey: ["quick-search", term],
    queryFn: () => apiFetch<QuickSearchGroup[]>(`/search/quick?q=${encodeURIComponent(term)}&limit=5`),
    enabled: active,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
  const typing = rawTerm.trim().length >= QUICK_SEARCH_MIN_LENGTH && rawTerm.trim() !== term;
  return { ...query, groups: active ? query.data : undefined, active, pending: typing || (active && query.isFetching) };
}
