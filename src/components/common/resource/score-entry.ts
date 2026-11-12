export type ScoreComponent = {
  id: string;
  code?: string | null;
  name: string;
  maxScore: number | string;
  coefficient?: number | string | null;
  includeInFinal?: boolean | null;
  displayOrder?: number | null;
};

// Bản nháp điểm chưa lưu: giữ cả hàng để lưu được kể cả khi người dùng đã sang trang khác.
export type ScoreDrafts = Record<string, { row: Record<string, unknown>; values: Record<string, string> }>;

// Nhận xét nháp của hồ sơ (tạm lưu ở giao diện, chỉ gửi server khi bấm nút lưu).
export type ScoreNoteDrafts = Record<string, { row: Record<string, unknown>; note: string }>;

export type ScoreNotes = {
  drafts: ScoreNoteDrafts;
  // false khi khóa đã kết thúc hoặc bị vô hiệu hóa.
  editable: boolean;
  valueOf: (rowId: string, row: Record<string, unknown>) => string;
  isDirty: (rowId: string) => boolean;
  onChange: (rowId: string, row: Record<string, unknown>, value: string) => void;
};

export type ScoreEntry = {
  notes: ScoreNotes;
  components: ScoreComponent[];
  drafts: ScoreDrafts;
  isEditable: (row: Record<string, unknown>) => boolean;
  valueOf: (rowId: string, row: Record<string, unknown>, componentId: string) => string;
  isInvalid: (component: ScoreComponent, value: string) => boolean;
  onChange: (rowId: string, row: Record<string, unknown>, componentId: string, value: string) => void;
};

// Tiêu đề cột gọn cho bảng chấm điểm: bảng đã dài ngang vì nhiều cột điểm nên tiêu đề dài như
// "Giáo xứ / giáo họ / giáo điểm" bị bóp thành nhiều dòng và đè lên dòng dữ liệu.
const SCORE_TABLE_LABELS: Record<string, string> = {
  parishName: "Giáo xứ",
  leaderParishName: "Giáo xứ",
};

export function scoreColumnLabel(column: string, fallback: string): string {
  return SCORE_TABLE_LABELS[column] ?? fallback;
}

// Độ rộng tối thiểu từng cột của bảng chấm điểm: chữ dài xuống dòng trong cột thay vì bóp cột,
// tổng bề rộng vượt khung thì bảng cuộn ngang (cột Huynh trưởng và Thao tác được ghim).
const SCORE_TABLE_COLUMN_WIDTHS: Record<string, string> = {
  leaderFullName: "min-w-44",
  parishName: "min-w-40",
  leaderParishName: "min-w-40",
  deaneryName: "min-w-32",
  leaderDeaneryName: "min-w-32",
  totalScore: "min-w-20 whitespace-nowrap",
  passed: "min-w-24 whitespace-nowrap",
  finalResult: "min-w-40 whitespace-nowrap",
};

export function scoreColumnWidthClass(column: string): string {
  return SCORE_TABLE_COLUMN_WIDTHS[column] ?? "min-w-24";
}

// Chú thích dưới tên cột điểm: điểm tối đa và hệ số (hoặc không tính vào tổng kết).
export function scoreComponentCaption(component: ScoreComponent): string {
  const max = `Tối đa ${Number(component.maxScore)}`;
  return component.includeInFinal === false ? `${max} · không tính tổng` : `${max} · hệ số ${Number(component.coefficient ?? 1)}`;
}

export function originalNote(row: Record<string, unknown>): string {
  return typeof row.scoreNote === "string" ? row.scoreNote : "";
}

export function originalScore(row: Record<string, unknown>, componentId: string): string {
  const list = Array.isArray(row.componentScores) ? (row.componentScores as { componentId?: string; score?: number | string | null }[]) : [];
  const found = list.find((item) => item.componentId === componentId);
  return found?.score === null || found?.score === undefined ? "" : String(found.score);
}

export function sameScore(left: string, right: string) {
  if (left.trim() === "" || right.trim() === "") return left.trim() === right.trim();
  return Number(left) === Number(right);
}

export function isInvalidScore(component: ScoreComponent, value: string) {
  if (value.trim() === "") return false;
  const score = Number(value);
  return !Number.isFinite(score) || score < 0 || score > Number(component.maxScore);
}

// Chạy tối đa `limit` tác vụ song song để lưu nhanh nhưng không dồn dập request.
export async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  async function lane() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index] as T) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}
