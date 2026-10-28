export type QuickSearchType = "leader" | "diocese" | "deanery" | "parish" | "course" | "certificate";

export type QuickSearchItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  status?: boolean | null;
};

export type QuickSearchGroup = {
  type: QuickSearchType;
  label: string;
  items: QuickSearchItem[];
};

// Kết quả đã dàn phẳng để điều hướng bằng bàn phím.
export type QuickSearchEntry = QuickSearchItem & { type: QuickSearchType };
