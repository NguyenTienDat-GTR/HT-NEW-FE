const DEFAULT_INTERVAL_MS = 1500;
const DEFAULT_MAX_ATTEMPTS = 400;

type Pollable = { status: string };

// Hỏi trạng thái tác vụ nền cho tới khi không còn PENDING. Quá số lần hỏi thì báo lỗi để người dùng thử lại.
export async function pollUntilDone<T extends Pollable>(
  first: T,
  fetchStatus: (current: T) => Promise<T>,
  options: { intervalMs?: number; maxAttempts?: number; sleep?: (ms: number) => Promise<void>; onTick?: (value: T) => void } = {},
): Promise<T> {
  const { intervalMs = DEFAULT_INTERVAL_MS, maxAttempts = DEFAULT_MAX_ATTEMPTS, onTick } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let current = first;
  for (let attempt = 0; attempt < maxAttempts && current.status === "PENDING"; attempt += 1) {
    await sleep(intervalMs);
    current = await fetchStatus(current);
    onTick?.(current);
  }
  if (current.status === "PENDING") {
    throw new Error("Quá thời gian chờ xử lý, vui lòng thử lại sau");
  }
  return current;
}
