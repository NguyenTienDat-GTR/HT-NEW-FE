import { useEffect, useMemo, useState } from "react";
import { useSessionState } from "@/lib/use-session-state";
import { EMPTY_FILTERS, buildLibraryParams, type LibraryFilters } from "./certificate-library-params";

/**
 * Trạng thái ô tìm kiếm / bộ lọc / sắp xếp / trang của thư viện cấu hình chứng nhận (tìm kiếm, lọc, sắp xếp, phân trang
 * đều do BE xử lý). Tìm kiếm, bộ lọc và sắp xếp được nhớ theo phiên trình duyệt; ô tìm kiếm được trì hoãn 400ms.
 */
export function useCertificateLibraryState() {
  const [searchInput, setSearchInput] = useSessionState("cert-library:searchInput", "");
  const [search, setSearch] = useSessionState("cert-library:search", "");
  const [filters, setFilters] = useSessionState<LibraryFilters>("cert-library:filters", EMPTY_FILTERS);
  const [sort, setSort] = useSessionState<string>("cert-library:sort", "default");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput, setSearch]);

  const libraryParams = useMemo(() => buildLibraryParams({ search, filters, sort, page }), [search, filters, sort, page]);
  const filtering = Boolean(search) || Object.values(filters).some(Boolean) || sort !== "default";
  // Số điều kiện đang lọc hiện trên nút Bộ lọc (không tính ô tìm kiếm).
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (sort !== "default" ? 1 : 0);

  function updateFilters(patch: Partial<LibraryFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  }

  return { searchInput, setSearchInput, search, filters, setFilters, sort, setSort, page, setPage, libraryParams, filtering, activeFilterCount, updateFilters };
}

export type CertificateLibraryState = ReturnType<typeof useCertificateLibraryState>;
