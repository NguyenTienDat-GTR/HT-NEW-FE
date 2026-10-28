"use client";

import { Buildings, Certificate, GraduationCap, MapPin, Users, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { QUICK_SEARCH_MIN_LENGTH } from "../hooks/use-quick-search";
import type { QuickSearchEntry, QuickSearchGroup, QuickSearchType } from "../types";

const ICONS: Record<QuickSearchType, Icon> = {
  leader: Users,
  diocese: Buildings,
  deanery: Buildings,
  parish: MapPin,
  course: GraduationCap,
  certificate: Certificate,
};

type Props = {
  term: string;
  groups: QuickSearchGroup[] | undefined;
  loading: boolean;
  failed: boolean;
  activeEntry: QuickSearchEntry | undefined;
  listboxId: string;
  onPick: (entry: QuickSearchEntry) => void;
};

export function QuickSearchResults({ term, groups, loading, failed, activeEntry, listboxId, onPick }: Props) {
  const trimmed = term.trim();
  if (trimmed.length < QUICK_SEARCH_MIN_LENGTH) {
    return <p className="px-4 py-6 text-center text-sm text-muted">Nhập ít nhất {QUICK_SEARCH_MIN_LENGTH} ký tự để tìm huynh trưởng, đơn vị, khóa huấn luyện hoặc chứng chỉ.</p>;
  }
  if (failed) return <p className="px-4 py-6 text-center text-sm text-danger">Không tìm kiếm được, vui lòng thử lại.</p>;
  if (!groups?.length) {
    return <p className="px-4 py-6 text-center text-sm text-muted">{loading ? "Đang tìm kiếm..." : `Không có kết quả cho "${trimmed}".`}</p>;
  }
  return (
    <div aria-busy={loading} className={cn("max-h-[min(70vh,440px)] overflow-y-auto py-2", loading && "opacity-70")} id={listboxId} role="listbox">
      {groups.map((group) => {
        const GroupIcon = ICONS[group.type];
        return (
          <div key={group.type} role="group" aria-label={group.label}>
            <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
            {group.items.map((item) => {
              const active = activeEntry?.type === group.type && activeEntry.id === item.id;
              return (
                <button
                  aria-selected={active}
                  className={cn(
                    "flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none",
                    active && "bg-surface-hover",
                  )}
                  key={`${group.type}:${item.id}`}
                  onClick={() => onPick({ ...item, type: group.type })}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                  type="button"
                >
                  <GroupIcon aria-hidden className="h-5 w-5 shrink-0 text-text-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-medium text-foreground", item.status === false && "text-muted line-through")}>{item.title}</span>
                    {item.subtitle ? <span className="block truncate text-xs text-muted">{item.subtitle}</span> : null}
                  </span>
                  {item.status === false ? <span className="shrink-0 rounded bg-surface-1 px-2 py-0.5 text-xs text-muted">Ngừng hoạt động</span> : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
