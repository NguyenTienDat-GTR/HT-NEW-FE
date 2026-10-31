export const PAGE_SIZE = 6;

export type LibraryFilters = {
  scope: string;
  isDefault: string;
  used: string;
  courseTypeCode: string;
  paperSize: string;
  orientation: string;
};

export const EMPTY_FILTERS: LibraryFilters = { scope: "", isDefault: "", used: "", courseTypeCode: "", paperSize: "", orientation: "" };

export const SORT_OPTIONS: [string, string][] = [
  ["default", "Mặc định"],
  ["name-asc", "Tên A → Z"],
  ["name-desc", "Tên Z → A"],
  ["used-desc", "Dùng nhiều nhất"],
  ["updated-desc", "Mới cập nhật"],
];

// Giá trị sắp xếp trên giao diện -> sortBy / sortDirection gửi lên BE.
const SORT_PARAMS: Record<string, { sortBy: string; sortDirection: string } | undefined> = {
  "name-asc": { sortBy: "name", sortDirection: "ASC" },
  "name-desc": { sortBy: "name", sortDirection: "DESC" },
  "used-desc": { sortBy: "usedByCount", sortDirection: "DESC" },
  "updated-desc": { sortBy: "updatedAt", sortDirection: "DESC" },
};

export function buildLibraryParams({ search, filters, sort, page }: { search: string; filters: LibraryFilters; sort: string; page: number }) {
  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (search) params.set("search", search);
  const active = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  if (Object.keys(active).length > 0) params.set("filters", JSON.stringify(active));
  const sortParams = SORT_PARAMS[sort];
  if (sortParams) {
    params.set("sortBy", sortParams.sortBy);
    params.set("sortDirection", sortParams.sortDirection);
  }
  return params.toString();
}
