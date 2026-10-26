import type { CandidateFilters, CopyCandidate } from "./types";

export type Option = { value: string; label: string };

// Bỏ dấu để tìm kiếm tiếng Việt không phân biệt dấu / hoa thường.
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function candidateName(candidate: CopyCandidate) {
  return [candidate.holyName, candidate.fullName].filter(Boolean).join(" ");
}

// includeFailed = false thì bộ lọc kết quả không áp dụng (danh sách chỉ có hồ sơ đạt).
export function filterCandidates(candidates: CopyCandidate[], filters: CandidateFilters, includeFailed: boolean) {
  const keyword = normalize(filters.search);
  return candidates.filter((candidate) => {
    if (filters.deaneryId && candidate.deaneryId !== filters.deaneryId) return false;
    if (filters.parishId && candidate.parishId !== filters.parishId) return false;
    if (includeFailed && filters.result && candidate.finalResult !== filters.result) return false;
    if (keyword) {
      const haystack = normalize([candidateName(candidate), candidate.parishName, candidate.deaneryName].filter(Boolean).join(" "));
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

function uniqueOptions(entries: [string | null, string | null][]): Option[] {
  const map = new Map<string, string>();
  for (const [value, label] of entries) {
    if (value && !map.has(value)) map.set(value, label ?? value);
  }
  return [...map.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

export function deaneryOptions(candidates: CopyCandidate[]) {
  return uniqueOptions(candidates.map((candidate) => [candidate.deaneryId, candidate.deaneryName]));
}

// Giáo xứ chỉ gồm các giáo xứ thuộc giáo hạt đang chọn (nếu có).
export function parishOptions(candidates: CopyCandidate[], deaneryId: string) {
  return uniqueOptions(candidates.filter((candidate) => !deaneryId || candidate.deaneryId === deaneryId).map((candidate) => [candidate.parishId, candidate.parishName]));
}

// Hồ sơ sẽ sao chép: đang hiển thị theo bộ lọc, sao chép được và không bị bỏ chọn.
export function idsToCopy(visible: CopyCandidate[], excluded: ReadonlySet<string>) {
  return visible.filter((candidate) => !candidate.blockedReason && !excluded.has(candidate.leaderId)).map((candidate) => candidate.leaderId);
}
