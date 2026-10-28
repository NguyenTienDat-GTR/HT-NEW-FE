"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import type { Option } from "../candidate-filter";
import { resultLabels, type CandidateFilters, type ResultFilter } from "../types";

const selectClass =
  "h-10 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-foreground transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]";

// Bộ lọc danh sách sao chép: giáo hạt, giáo xứ (theo giáo hạt đang chọn), kết quả (chỉ khi gồm cả hồ sơ không đạt) và tìm theo tên.
export function CandidateFilterBar({
  filters,
  onChange,
  deaneries,
  parishes,
  showResult,
}: {
  filters: CandidateFilters;
  onChange: (filters: CandidateFilters) => void;
  deaneries: Option[];
  parishes: Option[];
  showResult: boolean;
}) {
  return (
    <div className={`grid gap-3 ${showResult ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
      <label className="relative block">
        <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Tìm kiếm</span>
        <MagnifyingGlass className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted" />
        <Input className="h-10 pl-9" onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Tên huynh trưởng" value={filters.search} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Giáo hạt</span>
        <select className={selectClass} onChange={(event) => onChange({ ...filters, deaneryId: event.target.value, parishId: "" })} value={filters.deaneryId}>
          <option value="">Tất cả giáo hạt</option>
          {deaneries.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Giáo xứ / giáo họ / giáo điểm</span>
        <select className={selectClass} onChange={(event) => onChange({ ...filters, parishId: event.target.value })} value={filters.parishId}>
          <option value="">Tất cả giáo xứ</option>
          {parishes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {showResult ? (
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Kết quả</span>
          <select className={selectClass} onChange={(event) => onChange({ ...filters, result: event.target.value as ResultFilter })} value={filters.result}>
            <option value="">Tất cả kết quả</option>
            <option value="PASSED">{resultLabels.PASSED}</option>
            <option value="FAILED">{resultLabels.FAILED}</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}
