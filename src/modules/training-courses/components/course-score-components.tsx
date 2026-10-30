"use client";

type CourseScoreComponent = {
  id?: string;
  name?: string;
  maxScore?: number | string | null;
  coefficient?: number | string | null;
  includeInFinal?: boolean | null;
};

// Thành phần điểm riêng của khóa (chỉ xem). Chỉnh ở form "Sửa khóa".
export function CourseScoreComponentsPanel({ components }: { components: CourseScoreComponent[] }) {
  if (components.length === 0) {
    return <p className="text-[13px] text-muted">Khóa chưa có thành phần điểm nào. Sửa khóa để khai báo thành phần điểm.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-[13px]">
        <thead className="text-xs uppercase text-text-secondary">
          <tr>
            <th className="py-1.5 pr-3 font-semibold">Thành phần</th>
            <th className="py-1.5 pr-3 font-semibold">Điểm tối đa</th>
            <th className="py-1.5 pr-3 font-semibold">Hệ số</th>
            <th className="py-1.5 font-semibold">Tính tổng kết</th>
          </tr>
        </thead>
        <tbody>
          {components.map((item, index) => (
            <tr className="border-t border-border" key={item.id ?? index}>
              <td className="py-1.5 pr-3 font-medium text-foreground">{item.name}</td>
              <td className="py-1.5 pr-3">{item.maxScore}</td>
              <td className="py-1.5 pr-3">{item.coefficient}</td>
              <td className="py-1.5">{item.includeInFinal === false ? "Không" : "Có"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
