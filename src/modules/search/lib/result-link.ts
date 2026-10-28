import type { QuickSearchEntry, QuickSearchGroup, QuickSearchType } from "../types";

// Danh sách giáo phận / giáo hạt / giáo xứ không có trang chi tiết riêng: mở danh sách kèm ngăn chi tiết (?detail=).
const LIST_PATHS: Record<QuickSearchType, string> = {
  leader: "/leaders/profiles",
  diocese: "/organization/dioceses",
  deanery: "/organization/deaneries",
  parish: "/organization/parishes",
  course: "/training/courses",
  certificate: "/certificates",
};

const PAGE_TYPES: QuickSearchType[] = ["leader", "course", "certificate"];

export function resultHref(entry: Pick<QuickSearchEntry, "type" | "id">): string {
  const base = LIST_PATHS[entry.type];
  const id = encodeURIComponent(entry.id);
  return PAGE_TYPES.includes(entry.type) ? `${base}/${id}` : `${base}?detail=${id}`;
}

export function flattenGroups(groups: QuickSearchGroup[] | undefined): QuickSearchEntry[] {
  return (groups ?? []).flatMap((group) => group.items.map((item) => ({ ...item, type: group.type })));
}
