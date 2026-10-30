// Khóa idempotency: sinh một lần cho mỗi ý định của người dùng và dùng lại khi gửi lại, để bấm đúp / retry không thực hiện hai lần.
export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
