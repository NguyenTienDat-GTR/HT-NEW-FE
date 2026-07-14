export type BaseSearchParams = {
  page?: number;
  size?: 10 | 20 | 50 | 100;
  search?: string;
  searchFields?: string[];
  filters?: Record<string, string | number | boolean | null | undefined>;
  status?: boolean;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
};

export function serializeBaseSearch(params: BaseSearchParams) {
  const query = new URLSearchParams();

  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  if (params.search) query.set("search", params.search);
  params.searchFields?.slice(0, 10).forEach((field) => query.append("searchFields", field));
  if (params.status !== undefined) query.set("status", String(params.status));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDirection) query.set("sortDirection", params.sortDirection);

  const filters = Object.fromEntries(
    Object.entries(params.filters ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
  if (Object.keys(filters).length > 0) {
    query.set("filters", JSON.stringify(filters));
  }

  return query;
}
