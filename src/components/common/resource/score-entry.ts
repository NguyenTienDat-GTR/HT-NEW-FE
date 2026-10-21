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

// Ghi chú nháp của hồ sơ (tạm lưu ở giao diện, chỉ gửi server khi bấm nút lưu).
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
