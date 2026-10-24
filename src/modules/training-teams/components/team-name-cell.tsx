"use client";

// Ô nhập tên đội ngay trên dòng: chọn từ danh sách đội đã có (kể cả tên vừa nhập ở các dòng khác) hoặc gõ tên mới; chỉ lưu khi bấm Lưu.
export function TeamNameCell({
  datalistId,
  label,
  original,
  draft,
  onChange,
}: {
  datalistId: string;
  label: string;
  original: string;
  draft: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label={`Đội của ${label}`}
      className={`h-8 w-44 rounded-md border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 ${draft !== undefined ? "border-primary bg-primary/5" : "border-border"}`}
      list={datalistId}
      maxLength={150}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Chọn hoặc nhập đội"
      value={draft ?? original}
    />
  );
}

// Danh sách gợi ý: đội đã lưu và các tên đang nhập (chưa lưu), không trùng nhau (không phân biệt hoa thường).
export function teamSuggestions(savedNames: string[], drafts: Record<string, string>) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of [...savedNames, ...Object.values(drafts)]) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      names.push(name);
    }
  }
  return names;
}
