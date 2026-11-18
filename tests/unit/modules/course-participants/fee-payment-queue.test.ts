import { afterEach, describe, expect, it, vi } from "vitest";
import { FeePaymentQueue, isRetryableError, type FeeQueueOptions, type FeeSaveResult } from "@/modules/course-participants/fee-payment-queue";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const meta = (name = "Nguyễn An") => ({ label: name, context: "KH-1" });
const server = (paid: boolean, snapshotAt = 0) => ({ paid, snapshotAt });
const ok = (paid: boolean): FeeSaveResult => ({ paid, paidAt: paid ? "2026-11-18T08:00:00Z" : null });
const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

// Để các lời hứa đã giải quyết chạy xong (chuỗi await bên trong hàng đợi).
const flush = async () => {
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
};

function setup(save: FeeQueueOptions["save"], extra: Partial<FeeQueueOptions> = {}) {
  let clock = 10_000;
  const sleeps: number[] = [];
  const queue = new FeePaymentQueue({
    save,
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    idleDelayMs: 600,
    ...extra,
  });
  return { queue, sleeps, advance: (ms: number) => (clock += ms), clock: () => clock };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("FeePaymentQueue: lưu và hiển thị lạc quan", () => {
  it("đổi ô ngay, lưu nền rồi ổn định", async () => {
    const pending = deferred<FeeSaveResult>();
    const save = vi.fn(() => pending.promise);
    const { queue } = setup(save);

    expect(queue.toggle("a", true, server(false), meta())).toBe("queued");
    expect(queue.paidOf("a", false, 0)).toBe(true);
    expect(queue.busy("a")).toBe(true);
    expect(save).toHaveBeenCalledWith("a", true, "KH-1");

    pending.resolve(ok(true));
    await flush();
    expect(queue.busy("a")).toBe(false);
    expect(queue.paidOf("a", false, 0)).toBe(true);
    expect(queue.unsettled).toBe(0);
  });

  it("về đúng trạng thái đã lưu thì không gửi gì", () => {
    const save = vi.fn(async () => ok(false));
    const { queue } = setup(save);
    expect(queue.toggle("a", false, server(false), meta())).toBe("noop");
    expect(save).not.toHaveBeenCalled();
    expect(queue.busy("a")).toBe(false);
  });

  it("chạm lặp vào cùng hồ sơ trong 350ms chỉ tính một lần", async () => {
    const save = vi.fn(async (_id: string, paid: boolean) => ok(paid));
    const { queue, advance } = setup(save);
    expect(queue.toggle("a", true, server(false), meta())).toBe("queued");
    advance(120);
    expect(queue.toggle("a", false, server(false), meta())).toBe("ignored");
    await flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.paidOf("a", false, 0)).toBe(true);

    // Sau khoảng chờ thì bỏ tích được.
    advance(400);
    expect(queue.toggle("a", false, server(false), meta())).toBe("queued");
    await flush();
    expect(save).toHaveBeenLastCalledWith("a", false, "KH-1");
    expect(queue.paidOf("a", false, 0)).toBe(false);
  });

  it("đổi ý trong lúc đang lưu thì chỉ gửi trạng thái cuối cùng, mỗi hồ sơ một yêu cầu tại một thời điểm", async () => {
    const first = deferred<FeeSaveResult>();
    const second = deferred<FeeSaveResult>();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { queue, advance } = setup(save);

    queue.toggle("a", true, server(false), meta());
    advance(500);
    queue.toggle("a", false, server(false), meta());
    advance(500);
    queue.toggle("a", true, server(false), meta());
    // Yêu cầu đầu chưa xong nên chưa có yêu cầu thứ hai.
    expect(save).toHaveBeenCalledTimes(1);

    first.resolve(ok(true));
    await flush();
    // Trạng thái muốn có (đã đóng) khớp với kết quả đã lưu: không cần gửi thêm.
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.paidOf("a", false, 0)).toBe(true);
    expect(queue.busy("a")).toBe(false);
    second.resolve(ok(true));
  });

  it("đổi ý rồi giữ trạng thái khác với kết quả đang lưu thì gửi tiếp trạng thái cuối", async () => {
    const first = deferred<FeeSaveResult>();
    const second = deferred<FeeSaveResult>();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { queue, advance } = setup(save);

    queue.toggle("a", true, server(false), meta());
    advance(500);
    queue.toggle("a", false, server(false), meta());
    first.resolve(ok(true));
    await flush();

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("a", false, "KH-1");
    second.resolve(ok(false));
    await flush();
    expect(queue.paidOf("a", true, 0)).toBe(false);
    expect(queue.unsettled).toBe(0);
  });
});

describe("FeePaymentQueue: lỗi, retry và rollback", () => {
  it("lỗi mạng thì tự thử lại với cùng trạng thái đích rồi thành công", async () => {
    const save = vi
      .fn<FeeQueueOptions["save"]>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValueOnce(ok(true));
    const onError = vi.fn();
    const { queue, sleeps } = setup(save, { onError });

    queue.toggle("a", true, server(false), meta());
    await flush();

    expect(save).toHaveBeenCalledTimes(3);
    // Mọi lần thử đều gửi trạng thái đích "đã đóng": retry không thể đảo ngược kết quả.
    expect(save.mock.calls.map((call) => call[1])).toEqual([true, true, true]);
    expect(sleeps).toEqual([400, 1200]);
    expect(onError).not.toHaveBeenCalled();
    expect(queue.paidOf("a", false, 0)).toBe(true);
  });

  it("hết lượt thử vẫn lỗi thì trả ô về trạng thái đã lưu và báo lỗi", async () => {
    const save = vi.fn(async () => {
      throw apiError(500);
    });
    const onError = vi.fn();
    const { queue } = setup(save, { onError });

    queue.toggle("a", true, server(false), meta("Maria Trần Bình"));
    await flush();

    expect(save).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ id: "a", label: "Maria Trần Bình", revertedTo: false });
    expect(queue.paidOf("a", false, 0)).toBe(false);
    expect(queue.busy("a")).toBe(false);
  });

  it("lỗi quyền hoặc dữ liệu (4xx) không thử lại, trả ô về ngay", async () => {
    for (const status of [400, 403, 404, 409]) {
      const save = vi.fn(async () => {
        throw apiError(status);
      });
      const onError = vi.fn();
      const { queue, sleeps } = setup(save, { onError });
      queue.toggle("a", true, server(false), meta());
      await flush();
      expect(save).toHaveBeenCalledTimes(1);
      expect(sleeps).toEqual([]);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(queue.paidOf("a", false, 0)).toBe(false);
    }
  });

  it("bỏ tích bị lỗi thì ô vẫn là đã đóng như trên máy chủ", async () => {
    const save = vi.fn(async () => {
      throw apiError(403);
    });
    const { queue } = setup(save);
    queue.toggle("a", false, server(true), meta());
    await flush();
    expect(queue.paidOf("a", true, 0)).toBe(true);
  });

  it("phân loại lỗi nên thử lại", () => {
    expect(isRetryableError(new TypeError("Failed to fetch"))).toBe(true);
    for (const status of [408, 425, 429, 500, 502, 503, 504]) expect(isRetryableError(apiError(status))).toBe(true);
    for (const status of [400, 401, 403, 404, 409, 422]) expect(isRetryableError(apiError(status))).toBe(false);
  });
});

describe("FeePaymentQueue: tải lớn không treo", () => {
  it("tối đa 4 yêu cầu song song, phần còn lại xếp hàng theo thứ tự", async () => {
    const gates = new Map<string, Deferred<FeeSaveResult>>();
    let running = 0;
    let peak = 0;
    const order: string[] = [];
    const save = vi.fn(async (id: string, paid: boolean) => {
      running += 1;
      peak = Math.max(peak, running);
      order.push(id);
      const gate = deferred<FeeSaveResult>();
      gates.set(id, gate);
      const result = await gate.promise;
      running -= 1;
      return { ...result, paid };
    });
    const { queue } = setup(save);

    for (let index = 0; index < 10; index += 1) queue.toggle(`p${index}`, true, server(false), meta(`Người ${index}`));
    await flush();
    expect(save).toHaveBeenCalledTimes(4);
    expect(order).toEqual(["p0", "p1", "p2", "p3"]);

    gates.get("p0")!.resolve(ok(true));
    await flush();
    expect(save).toHaveBeenCalledTimes(5);
    expect(order[4]).toBe("p4");
    expect(peak).toBe(4);
    // p0 đã xong, 9 hồ sơ còn lại chưa lưu xong (4 đang chạy, 5 đang chờ).
    expect(queue.unsettled).toBe(9);
  });

  it("tích liên tiếp 200 hồ sơ đều được lưu đúng một lần, không vượt giới hạn song song", async () => {
    let running = 0;
    let peak = 0;
    const saved = new Map<string, number>();
    const save = vi.fn(async (id: string, paid: boolean) => {
      running += 1;
      peak = Math.max(peak, running);
      await Promise.resolve();
      await Promise.resolve();
      saved.set(id, (saved.get(id) ?? 0) + 1);
      running -= 1;
      return ok(paid);
    });
    const { queue } = setup(save);

    for (let index = 0; index < 200; index += 1) queue.toggle(`p${index}`, true, server(false), meta());
    for (let index = 0; index < 400; index += 1) await Promise.resolve();

    expect(saved.size).toBe(200);
    expect([...saved.values()].every((count) => count === 1)).toBe(true);
    expect(peak).toBeLessThanOrEqual(4);
    expect(queue.unsettled).toBe(0);
  });

  it("một hồ sơ lỗi không chặn các hồ sơ khác", async () => {
    const save = vi.fn(async (id: string, paid: boolean) => {
      if (id === "bad") throw apiError(409);
      return ok(paid);
    });
    const { queue } = setup(save);
    queue.toggle("a", true, server(false), meta());
    queue.toggle("bad", true, server(false), meta());
    queue.toggle("b", true, server(false), meta());
    await flush();
    expect(queue.paidOf("a", false, 0)).toBe(true);
    expect(queue.paidOf("b", false, 0)).toBe(true);
    expect(queue.paidOf("bad", false, 0)).toBe(false);
  });
});

describe("FeePaymentQueue: số liệu tổng hợp và dữ liệu máy chủ mới", () => {
  it("delta cộng phần thay đổi vào số liệu máy chủ cũ và tự bỏ khi dữ liệu mới về", async () => {
    const save = vi.fn(async (_id: string, paid: boolean) => ok(paid));
    const { queue, clock } = setup(save);
    queue.toggle("a", true, server(false), meta());
    queue.toggle("b", true, server(false), meta());
    queue.toggle("c", false, server(true), meta());
    await flush();
    const settledAt = clock();

    // Tổng hợp lấy trước khi lưu xong: +1 +1 -1.
    expect(queue.delta(settledAt - 1)).toBe(1);
    // Tổng hợp lấy sau khi lưu xong đã phản ánh sẵn: không cộng nữa (tránh tính hai lần).
    expect(queue.delta(settledAt)).toBe(0);
    expect(queue.delta(settledAt + 5000)).toBe(0);
  });

  it("dữ liệu máy chủ mới thay thế bản lạc quan cũ; thay đổi tiếp lấy mốc từ dữ liệu mới", async () => {
    const save = vi.fn(async (_id: string, paid: boolean) => ok(paid));
    const { queue, advance, clock } = setup(save);
    queue.toggle("a", true, server(false, 0), meta());
    await flush();
    const settledAt = clock();
    expect(queue.paidOf("a", false, settledAt - 1)).toBe(true);
    // Máy chủ trả dữ liệu mới (đã đóng) sau khi lưu xong.
    expect(queue.paidOf("a", true, settledAt + 100)).toBe(true);
    expect(queue.paidOf("a", false, settledAt + 100)).toBe(false);

    advance(1000);
    queue.toggle("a", false, server(true, settledAt + 100), meta());
    await flush();
    expect(queue.paidOf("a", true, 0)).toBe(false);
    // Mốc ban đầu của lần thay đổi này là "đã đóng": số liệu tổng hợp cũ phải trừ đi một người.
    expect(queue.delta(settledAt + 100)).toBe(-1);
  });

  it("release xóa các bản lạc quan đã ổn định trước mốc dữ liệu", async () => {
    const save = vi.fn(async (_id: string, paid: boolean) => ok(paid));
    const { queue, clock } = setup(save);
    queue.toggle("a", true, server(false), meta());
    await flush();
    const settledAt = clock();
    queue.release(settledAt - 1);
    expect(queue.paidOf("a", false, 0)).toBe(true);
    queue.release(settledAt);
    expect(queue.paidOf("a", false, 0)).toBe(false);
  });
});

describe("FeePaymentQueue: làm mới khi rảnh", () => {
  it("báo rảnh một lần, kèm các khóa vừa thay đổi, sau khi hàng đợi rỗng", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (_id: string, paid: boolean) => ok(paid));
    const onIdle = vi.fn();
    const { queue } = setup(save, { onIdle });

    queue.toggle("a", true, server(false), { label: "An", context: "KH-1" });
    queue.toggle("b", true, server(false), { label: "Bình", context: "KH-2" });
    await vi.advanceTimersByTimeAsync(300);
    expect(onIdle).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onIdle.mock.calls[0][0].sort()).toEqual(["KH-1", "KH-2"]);

    await vi.advanceTimersByTimeAsync(5000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("còn việc mới thì hoãn báo rảnh, và không báo khi không có gì thay đổi", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (_id: string, paid: boolean) => ok(paid));
    const onIdle = vi.fn();
    const { queue, advance } = setup(save, { onIdle });

    queue.toggle("noop", false, server(false), meta());
    await vi.advanceTimersByTimeAsync(2000);
    expect(onIdle).not.toHaveBeenCalled();

    queue.toggle("a", true, server(false), meta());
    await vi.advanceTimersByTimeAsync(500);
    advance(1000);
    queue.toggle("b", true, server(false), meta());
    await vi.advanceTimersByTimeAsync(500);
    expect(onIdle).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });
});
