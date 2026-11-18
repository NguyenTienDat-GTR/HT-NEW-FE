import { cn } from "@/lib/utils";
import { formatVnd } from "@/lib/money";

// Dải tổng hợp lệ phí gọn đặt đầu khung danh sách tham dự: tổng tiền, đã đóng, còn thiếu và số người chưa đóng.
// Số liệu tính trên danh sách tham dự hiện tại (đã cộng phần thay đổi chưa lưu xong); điện thoại xếp 2 × 2.
export function FeeSummaryStrip({
  amount,
  participantCount,
  paidCount,
  loading,
}: {
  amount: number;
  participantCount: number;
  paidCount: number;
  loading?: boolean;
}) {
  const unpaidCount = Math.max(participantCount - paidCount, 0);
  const total = amount * participantCount;
  const paidTotal = amount * paidCount;
  const remaining = total - paidTotal;
  const text = (value: string) => (loading ? "…" : value);

  return (
    <dl aria-label="Tổng hợp lệ phí" className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
      <Stat label="Tổng tiền" title={`${formatVnd(amount)} × ${participantCount} người trong danh sách tham dự`} value={text(formatVnd(total))} />
      <Stat label="Đã đóng" tone="success" value={text(formatVnd(paidTotal))} />
      <Stat label="Còn thiếu" tone={remaining > 0 ? "warning" : undefined} value={text(formatVnd(remaining))} />
      <Stat label="Chưa đóng" value={text(`${unpaidCount.toLocaleString("vi-VN")} người`)} />
    </dl>
  );
}

function Stat({ label, value, tone, title }: { label: string; value: string; tone?: "success" | "warning"; title?: string }) {
  return (
    <div className="bg-slate-50 px-4 py-2" title={title}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className={cn("text-sm font-bold tabular-nums text-foreground", tone === "success" && "text-success", tone === "warning" && "text-warning")}>{value}</dd>
    </div>
  );
}
