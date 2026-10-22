// Hiện ngay trong lúc server lấy dữ liệu trang (tổng quan...), thay vì để trắng.
export default function Loading() {
  return <div aria-busy className="h-[420px] rounded-xl border border-border bg-white motion-safe:animate-pulse" />;
}
