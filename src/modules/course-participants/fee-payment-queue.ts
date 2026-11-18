// Hàng đợi tự lưu trạng thái đóng lệ phí (tích / bỏ tích trong bảng và nút "Đã đóng tiền" ở màn quét).
//
// Mục tiêu: tích liên tục nhiều người không lỗi và không treo, lưu hỏng thì trả về đúng trạng thái đã lưu (không để
// hai lần lưu làm "đã đóng" thành "chưa đóng"):
//  - Ô đổi ngay trên giao diện (lạc quan), việc lưu chạy nền.
//  - Mỗi hồ sơ chỉ có một yêu cầu đang chạy; đổi ý trong lúc lưu thì chỉ gửi trạng thái cuối cùng.
//  - Toàn hàng đợi tối đa `maxConcurrent` yêu cầu song song, phần còn lại xếp hàng.
//  - Chạm lặp vào cùng một hồ sơ trong `repeatGuardMs` chỉ tính một lần (bấm đúp).
//  - Luôn gửi trạng thái ĐÍCH nên retry không thể đảo ngược kết quả; lỗi mạng / 429 / 5xx tự thử lại, lỗi khác trả ô về như cũ.
//  - Khi hàng đợi rỗng một lúc (`idleDelayMs`) thì báo `onIdle` một lần để làm mới dữ liệu.
//
// Ô hiển thị theo `paidOf(...)`: bản lạc quan chỉ có hiệu lực với dữ liệu máy chủ lấy TRƯỚC khi lưu xong (so theo `snapshotAt`),
// nên dữ liệu mới tải về thay thế ngay mà không phải đoán lúc nào "thả" bản lạc quan.

export type FeeSaveResult = { paid: boolean; paidAt: string | null };

export type FeeQueueOptions = {
  save: (id: string, paid: boolean, context: string) => Promise<FeeSaveResult>;
  maxConcurrent?: number;
  retryDelaysMs?: number[];
  repeatGuardMs?: number;
  idleDelayMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onError?: (info: { id: string; label: string; error: unknown; revertedTo: boolean }) => void;
  // Khi hàng đợi rỗng một lúc sau khi có thay đổi: danh sách `context` (mã khóa) vừa được lưu, để làm mới đúng dữ liệu đó.
  onIdle?: (contexts: string[]) => void;
};

type Entry = {
  // Trạng thái máy chủ khi bắt đầu thay đổi (để tính phần chênh cho các con số tổng hợp).
  baseline: boolean;
  // Trạng thái đã lưu thành công gần nhất.
  confirmed: boolean;
  // Trạng thái người dùng muốn (hiển thị).
  target: boolean;
  // null = còn việc chưa lưu xong; có giá trị = thời điểm ổn định (đã lưu hoặc đã trả về).
  settledAt: number | null;
  inFlight: boolean;
  lastClickAt: number;
  label: string;
  context: string;
};

export type ToggleOutcome = "queued" | "ignored" | "noop";

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Lỗi mạng (không có mã trạng thái), quá tải hoặc lỗi máy chủ thì thử lại; lỗi 4xx khác (quyền, dữ liệu) thì không. */
export function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === undefined || RETRYABLE_STATUSES.has(status);
}

export class FeePaymentQueue {
  private readonly entries = new Map<string, Entry>();
  private readonly queued = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private running = 0;
  private version = 0;
  // Các `context` đã có thay đổi được lưu (hoặc trả về) kể từ lần báo rảnh trước.
  private readonly touched = new Set<string>();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxConcurrent: number;
  private readonly retryDelays: number[];
  private readonly repeatGuardMs: number;
  private readonly idleDelayMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: FeeQueueOptions) {
    this.maxConcurrent = Math.max(1, options.maxConcurrent ?? 4);
    this.retryDelays = options.retryDelaysMs ?? [400, 1200];
    this.repeatGuardMs = options.repeatGuardMs ?? 350;
    this.idleDelayMs = options.idleDelayMs ?? 600;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  // ---------- đọc ----------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = () => this.version;

  /** Số hồ sơ còn thay đổi chưa lưu xong. */
  get unsettled(): number {
    let count = 0;
    for (const entry of this.entries.values()) if (entry.settledAt === null) count += 1;
    return count;
  }

  /** Trạng thái đã đóng để hiển thị: bản lạc quan nếu còn hiệu lực với dữ liệu máy chủ đó, ngược lại là chính dữ liệu máy chủ. */
  paidOf(id: string, serverPaid: boolean, snapshotAt: number): boolean {
    const entry = this.entries.get(id);
    return entry && this.applies(entry, snapshotAt) ? entry.target : serverPaid;
  }

  /** Hồ sơ đang chờ lưu (hiện mờ để người dùng biết chưa lưu xong). */
  busy(id: string): boolean {
    return this.entries.get(id)?.settledAt === null;
  }

  /** Chênh lệch số người đã đóng so với số liệu tổng hợp máy chủ lấy vào `snapshotAt` (cộng vào số liệu đó). */
  delta(snapshotAt: number): number {
    let total = 0;
    for (const entry of this.entries.values()) {
      if (this.applies(entry, snapshotAt)) total += (entry.target ? 1 : 0) - (entry.baseline ? 1 : 0);
    }
    return total;
  }

  // ---------- ghi ----------

  /**
   * Đặt trạng thái muốn có cho một hồ sơ. `server` là trạng thái máy chủ đang hiển thị và thời điểm lấy dữ liệu đó.
   * "ignored": chạm lặp quá nhanh vào cùng hồ sơ; "noop": đã đúng trạng thái đã lưu, không cần gửi.
   */
  toggle(id: string, paid: boolean, server: { paid: boolean; snapshotAt: number }, meta: { label: string; context: string }): ToggleOutcome {
    const now = this.now();
    const current = this.entries.get(id);
    if (current && now - current.lastClickAt < this.repeatGuardMs) return "ignored";

    const obsolete = current !== undefined && current.settledAt !== null && server.snapshotAt >= current.settledAt;
    let entry = current;
    if (!entry || obsolete) {
      entry = { baseline: server.paid, confirmed: server.paid, target: paid, settledAt: null, inFlight: false, lastClickAt: now, label: meta.label, context: meta.context };
      this.entries.set(id, entry);
    } else {
      entry.target = paid;
      entry.settledAt = null;
      entry.label = meta.label;
      entry.context = meta.context;
    }
    entry.lastClickAt = now;

    let outcome: ToggleOutcome = "queued";
    if (entry.target === entry.confirmed && !entry.inFlight) {
      entry.settledAt = now;
      this.queued.delete(id);
      outcome = "noop";
    } else {
      this.queued.add(id);
      this.cancelIdle();
    }
    this.bump();
    this.pump();
    return outcome;
  }

  /** Xóa các bản lạc quan đã ổn định trước `snapshotAt` (dữ liệu máy chủ lấy sau thời điểm đó đã phản ánh chúng). */
  release(snapshotAt: number): void {
    let changed = false;
    for (const [id, entry] of this.entries) {
      if (entry.settledAt !== null && !entry.inFlight && !this.queued.has(id) && snapshotAt >= entry.settledAt) {
        this.entries.delete(id);
        changed = true;
      }
    }
    if (changed) this.bump();
  }

  // ---------- nội bộ ----------

  private applies(entry: Entry, snapshotAt: number): boolean {
    return entry.settledAt === null || snapshotAt < entry.settledAt;
  }

  private bump() {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  private cancelIdle() {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private checkIdle() {
    if (this.running > 0 || this.queued.size > 0) return;
    this.cancelIdle();
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.running > 0 || this.queued.size > 0 || this.touched.size === 0) return;
      const contexts = [...this.touched];
      this.touched.clear();
      this.options.onIdle?.(contexts);
    }, this.idleDelayMs);
  }

  private pump() {
    for (const id of [...this.queued]) {
      if (this.running >= this.maxConcurrent) break;
      const entry = this.entries.get(id);
      if (!entry) {
        this.queued.delete(id);
        continue;
      }
      if (entry.inFlight) continue;
      void this.send(id, entry);
    }
    this.checkIdle();
  }

  private async send(id: string, entry: Entry) {
    this.queued.delete(id);
    entry.inFlight = true;
    this.running += 1;
    const sent = entry.target;
    try {
      const result = await this.attempt(id, sent, entry.context);
      entry.confirmed = result.paid;
      this.touched.add(entry.context);
      if (entry.target === sent || entry.target === entry.confirmed) {
        // Đã đúng điều người dùng muốn (hoặc máy chủ trả trạng thái khác thì hiển thị đúng theo máy chủ): không gửi thêm.
        entry.target = entry.confirmed;
        entry.settledAt = this.now();
        this.queued.delete(id);
      } else {
        // Người dùng đổi ý trong lúc lưu: gửi tiếp trạng thái cuối cùng.
        this.queued.add(id);
      }
    } catch (error) {
      entry.target = entry.confirmed;
      entry.settledAt = this.now();
      this.queued.delete(id);
      this.touched.add(entry.context);
      this.options.onError?.({ id, label: entry.label, error, revertedTo: entry.confirmed });
    } finally {
      entry.inFlight = false;
      this.running -= 1;
      this.bump();
      this.pump();
    }
  }

  private async attempt(id: string, paid: boolean, context: string): Promise<FeeSaveResult> {
    let lastError: unknown;
    for (let index = 0; index <= this.retryDelays.length; index += 1) {
      try {
        return await this.options.save(id, paid, context);
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error) || index === this.retryDelays.length) break;
        await this.sleep(this.retryDelays[index]);
      }
    }
    throw lastError;
  }
}
