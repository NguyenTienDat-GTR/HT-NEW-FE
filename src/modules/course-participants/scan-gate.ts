// Camera quét liên tục nên cùng một mã QR bị đọc hàng chục lần mỗi giây: chỉ xử lý một lần trong khoảng chờ,
// còn mã khác thì xử lý ngay. Trạng thái nằm ngoài React để dùng trong vòng lặp requestAnimationFrame.
export type ScanGateState = { token: string; at: number } | null;

export const DEFAULT_SCAN_COOLDOWN_MS = 3000;

export function shouldProcessScan(token: string, now: number, last: ScanGateState, cooldownMs = DEFAULT_SCAN_COOLDOWN_MS): boolean {
  if (!token) return false;
  if (!last) return true;
  if (last.token !== token) return true;
  return now - last.at >= cooldownMs;
}

export function markScanned(token: string, now: number): ScanGateState {
  return { token, at: now };
}
